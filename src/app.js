import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from 'dayjs';
import Joi from "joi";

const app = express();

app.use(cors());
app.use(express.json());

//  CONNECTION
dotenv.config();
const mongoClient = new MongoClient(process.env.DATABASE_URL);
const db = mongoClient.db(); 


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


// participante = {name: 'João', lastStatus: 12313123} // O conteúdo do lastStatus será explicado nos próximos requisitos
// mensagem = {from: 'João', to: 'Todos', text: 'oi galera', type: 'message', time: '20:04:37'}

//POST/participants

// - [ ]  Por fim, em caso de sucesso, retornar **status 201**. Não é necessário retornar nenhuma mensagem além do status.

// ROUTES
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


