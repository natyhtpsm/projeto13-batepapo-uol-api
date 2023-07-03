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
    name: Joi.string().required().min(2)
})
const schemaMensagem = Joi.object({
    to: Joi.string().required().min(2),
    text: Joi.string().required().min(2),
    type: Joi.string().valid('message', 'private_message').required(),
    from: Joi.string().required()
})

app.post ("/participants", async (req, res) =>{
    const {name} = req.body;
    const validation = schemaNome.validate({name});
    if (!name) {
        return res.sendStatus(401);
    }
    if(!validation){
        return res.sendStatus(422);
    }
    try{
        const nameExists = await db.collection('participants').findOne({name});
        if (nameExists){
            return res.sendStatus(409);
        }
        await db.collection('participants').insertOne({
            name: name,
            lastStatus: Date.now()});
        await db.collection('messages').insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: Date.now().toString()});
        return res.sendStatus(201);
    }
    catch(e){console.log(e.message)}
})

app.post("/messages", async (req, res) =>{
    const {to, text, type} = req.body;
    const {user} = req.headers;
    const validation = schemaMensagem.validate({to, text, type, from: user});
    if (validation.error){
        return res.status(422).send("Mensagem inválida");
    }
    try{
        const userActive = await db.collection('participants').findOne({name: user});
        if(!userActive){
            return res.sendStatus(422);
        }
        let message = {from: user, to, text, type, time: dayjs().format('HH:mm:ss')};
        await db.collection("messages").insertOne(message).toArray();
        return res.sendStatus(201);
    }catch(e){
        return res.send(e.message);
    }
});

app.get("/participants", async (req, res) => {
    try{
        const participants = await db.collection('participants').find();
        if(!participants){
            return res.send([]).status(200);
        }
        return res.send(participants).status(200);
    }
    catch(e){
        return res.status(500).send(e.message);
    }
});

app.get("/messages", async (req, res) => {
    const {user} = req.headers;
    let limit = req.query.limit !== undefined ? parseInt(req.query.limit) : undefined;
    try{
        if(limit === undefined){
            const messages = await db.collection('messages').find({$or: [{ to: user }, { from: user }, { to: 'Todos' }],}).toArray();
            return res.send(messages).status(200);
        } 
            if (isNaN(limit) || limit <= 0) {
                return res.status(422).send('Valor inválido para o parâmetro limit');
            }
            if(limit>0){
                const messages = await db.collection('messages').find({$or: [{ to: user }, { from: user }, { to: 'Todos' }],}).limit(limit).toArray();
                return res.send(messages).status(200);
            }  
        return res.send([]).status(200);
    }
    catch(e){
        return res.status(500).send(e.message);
    }
});


app.listen(5000, () => {console.log("Server is running on port 5000")});