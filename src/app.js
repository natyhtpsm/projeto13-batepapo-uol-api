import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from 'dayjs';
import Joi from "joi";

const app = express();

app.use(cors());
app.use(express.json());

dotenv.config();
const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
	await mongoClient.connect() 
	console.log("MongoDB conectado!")
} catch (err) {
	(err) => console.log(err.message)
}

const db = mongoClient.db()


// SCHEMES
const schemaNome = Joi.object({
    name: Joi.string().required().min(1)
})
const schemaMensagem = Joi.object({
    to: Joi.string().required().min(1),
    text: Joi.string().required().min(1),
    type: Joi.string().valid('message', 'private_message'),
    from: Joi.string().required(),
    time: Joi.string().required()
})

app.post ("/participants", async (req, res) =>{
    const name = req.body;
    const validation = schemaNome.validate({name});

    if(!validation){
        return res.status(422).send("Nome inválido");
    }
    try{
        const nameExists = await db.collection('participants').findOne(name);
        if (nameExists){
            return res.status(409).send("Usuário já existe");
        }
        await db.collection('participants').insertOne({
            nome: name,
            lastStatus: Date.now()});
        await db.collection('messages').insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: Date.now()});
    
        return res.sendStatus(201);
    }
    catch(e){console.log(e.message)}
})

app.post("/messages", async (req, res) =>{
    const {to, text, type} = req.body;
    const {user} = req.headers;
    const validation = schemaMensagem.validate({to, text, type, from: user});
    if (validation.error){
        res.status(422).send("Mensagem inválida");
        return;
    }
    try{
        let message = {from: user, to, text, type, time: dayjs().format('HH:mm:ss')};
        await db.collection("messages").insertOne(message);
        res.status(201).send(201);
    }catch{
        res.send("Erro no servidor");
    }
});

app.listen(5000, () => {console.log("Server is running on port 5000")});