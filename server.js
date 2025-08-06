import express from 'express'
import dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

app.post('/api/token', async (req, res) => {
    try {
        const body = new URLSearchParams()
        body.append('client_id', process.env.EMPORIX_CLIENT_ID)
        body.append('client_secret', process.env.EMPORIX_CLIENT_SECRET)
        body.append('grant_type', 'client_credentials')

        const tokenRes = await fetch(process.env.EMPORIX_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        })

        if (!tokenRes.ok) {
            const text = await tokenRes.text()
            return res.status(tokenRes.status).send(`Token error: ${text}`)
        }

        const data = await tokenRes.json()
        res.json({ access_token: data.access_token })
    } catch (err) {
        console.error('❌ Fehler beim Token-Request:', err)
        res.status(500).json({ error: 'Interner Fehler beim Tokenabruf' })
    }
})

app.listen(port, () => {
    console.log(`🚀 Server läuft auf http://localhost:${port}`)
})
