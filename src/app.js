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
    console.log('VALIDATION: ', validation);
    if (!name) {
        return res.sendStatus(422);
    }
    if(!validation || !isNaN(name)){
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
            time: dayjs().format('HH:mm:ss')});
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
        const participants = await db.collection('participants').find().toArray();
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

app.post("/status", async (req, res) => {
    const {user} = req.headers;

    if(!user){
        return res.sendStatus(404);
    }
    try{
        const userExist = await db.collection('participants').findOne({name: user});
        if(!userExist){
            return res.sendStatus(404);
        }
        const update = await db.collection('participants').updateOne({name: user}, {$set: {lastStatus : Date.now()}});
        if(update){
            return res.sendStatus(201);
        }
    }
    catch(e){
        console.log(e.message);
    }
    
})

setInterval(async() => {
    try{
        const participants = await db.collection('participants').find().toArray();
        for(let i=0; i<participants.length; i++){
            if(Date.now() - participants[i].lastStatus > 10000){
                await db.collection('participants').deleteOne({name: participants[i].name});
                let message = {from: participants[i].name, to: 'Todos', text: 'sai da sala...', type: 'status', 
                time: dayjs().format('HH:mm:ss')};
                await db.collection('messages').insertOne(message);
            }
        }
    }
    catch(e){
        console.log(e.message);
    }
} , 15000);

app.listen(5000, () => {console.log("Server is running on port 5000")});