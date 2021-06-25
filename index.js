require('dotenv').config()

const express = require('express')
const app = express()
const cors = require('cors')
const morgan = require('morgan')
const Note = require('./models/note')

app.use(cors())
morgan.token('body-post', function (req, res) {
    return JSON.stringify(req.body)
})

const logger = morgan(function (tokens, req, res) {
    return [
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, 'content-length'), '-',
        tokens['response-time'](req, res), 'ms',
        tokens['body-post'](req, res)
    ].join(' ')
})

app.use(express.static('build'))
app.use(express.json())
app.use(logger)


//Get all notes
app.get('/api/notes', (request, response) => {
    Note.find({}).then(notes => {
        response.json(notes)
    })
})

//Get one note
app.get('/api/notes/:id', (request, response, next) => {
    Note.findById(request.params.id).then(note => {
        if (note) {
            response.json(note)
        } else {
            response.status(404).end()
        }
    })
        .catch(error => next(error))
})

//Delete resource
app.delete('/api/notes/:id', (request, response, next) => {
    Note.findByIdAndRemove(request.params.id)
        .then(result => {
            response.status(204).end()
        })
        .catch(error => next(error))
})

//Toggle note importance
app.put('/api/notes/:id', (request, response, next) => {
    const { content, important } = request.body

    if (content === undefined) {
        return response.status(400).json({ error: 'content missing' })
    }

    const note = {
        content: content,
        important: important
    }

    Note.findByIdAndUpdate(request.params.id, note, { new: true })
        .then(updatedNote => { response.json(updatedNote) })
        .catch(error => next(error))
})

//Post a note
app.post('/api/notes', (request, response, next) => {
    const { content, important } = request.body

    const note = new Note({
        content: content,
        important: important || false,
        date: new Date()
    })

    note
        .save()
        .then(savedNote => savedNote.toJSON())
        .then(savedAndFormattedNote => response.json(savedAndFormattedNote))
        .catch(error => next(error))
})

const unknownEndpoint = (request, response) => {
    response.status(404).send({ error: 'unknown endpoint' })
}

app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
    const { name, message } = error
    console.log(message)
    if (name === 'CastError') {
        return response.status(400).send({ error: 'malformatted id' })
    } else if (name === 'ValidationError') {
        return response.status(400).json({ error: message })
    }

    next(error)
}

app.use(errorHandler)

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})