const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

let db;
client.connect().then(() => {
  db = client.db('eventdb');
}).catch(err => console.error('Failed to connect to MongoDB', err));

async function getEvents(type, page, limit) {
    const client = new MongoClient(uri, { useUnifiedTopology: true });

    try {
        await client.connect();
        const db = client.db('eventdb');
        const collection = db.collection('events');

        const query = {};
        const sort = {};
        if (type === 'latest') {
            sort.date = -1;
        }

        console.log('Query:', query);
        console.log('Sort:', sort);

        const events = await collection
            .find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        console.log('Events:', events);

        if (events.length === 0) {
            throw new Error('Event not found');
        }

        return events;
    } finally {
        await client.close();
    }
}
// GET request to fetch an event by ID
app.get('/api/v3/app/events', async (req, res) => {
    const { type, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    try {
        const events = await getEvents(type, pageNumber, limitNumber);
        res.json(events);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// POST request to create a new event
app.post('/api/v3/app/events', async (req, res) => {
    try {
        console.log('Received Data:', req.body); // Log the incoming data

        // Attempt to insert the event into the database
        const result = await db.collection('events').insertOne(req.body);

        // Log the result of the insert operation
        console.log('Insert Result:', result);

        if (result.acknowledged) {
            res.status(201).json({ message: 'Event created successfully', eventId: result.insertedId });
        } else {
            res.status(500).json({ error: 'Failed to create event' });
        }
    } catch (err) {
        console.error('Error while creating event:', err); // Log any error that occurs
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// PUT request to update an event by ID
app.put('/api/v3/app/events/:id', async (req, res) => {
    const { id } = req.params;
    const event = req.body;

    try {
        const result = await db.collection('events').updateOne(
            { _id: new ObjectId(id) }, 
            { $set: event },
            { upsert: true } // If no document matches, insert a new one
        );

        if (result.matchedCount > 0) {
            res.json({ message: 'Event updated successfully' });
        } else if (result.upsertedCount > 0) {
            res.status(201).json({ message: 'Event created successfully', eventId: result.upsertedId._id });
        } else {
            res.status(500).json({ error: 'Failed to create or update event' });
        }
    } catch (err) {
        console.error('Error updating or inserting event:', err);
        res.status(500).json({ error: 'Failed to create or update event' });
    }
});

// DELETE request to remove an event by ID
app.delete('/api/v3/app/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.collection('events').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
            res.json({ message: 'Event deleted' });
        } else {
            res.status(404).json({ error: 'Event not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
