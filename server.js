const express = require('express')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// CORS erlauben
app.use(cors({
    origin: 'https://hello-world-extension.onrender.com', // deine Emporix Extension-URL
}))

app.use(express.json())

app.post('/api/token', async (req, res) => {
    try {
        const response = await fetch('https://api.emporix.io/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.EMPORIX_CLIENT_ID,
                client_secret: process.env.EMPORIX_CLIENT_SECRET,
            }),
        })

        console.log('🔁 Emporix response status:', response.status)

        const text = await response.text()
        console.log('📦 Raw response body:', text)

        const data = text ? JSON.parse(text) : {}

        if (!response.ok) {
            console.error('❌ Fehler vom Token-Endpunkt:', data)
            return res.status(response.status).json({ error: data })
        }

        res.json(data)
    } catch (error) {
        console.error('❌ Token error:', error)
        res.status(500).json({ error: 'Token error: ' + error.message })
    }
})


app.listen(port, () => {
    console.log(`🚀 Server läuft auf http://localhost:${port}`)
})
