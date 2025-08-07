const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TENANT = process.env.TENANT || 'dvpd'; // fallback tenant

// Token abrufen über client_credentials
async function getServiceToken() {
    const tokenUrl = process.env.TOKEN_URL || 'https://api.emporix.io/oauth/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);

    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Token error: ${errText}`);
    }

    const data = await res.json();
    return data.access_token;
}

async function getCustomEntityToken() {
    const tokenUrl = process.env.CUSTOM_TOKEN_URL || 'https://api.emporix.io/oauth/token'
    const params = new URLSearchParams()
    params.append('grant_type', 'client_credentials')
    params.append('client_id', process.env.CUSTOM_CLIENT_ID)
    params.append('client_secret', process.env.CUSTOM_CLIENT_SECRET)

    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
    })

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Token error: ${errorText}`)
    }

    const data = await res.json()
    return data.access_token
}


// Vendor-User-Zuordnung
async function findVendorIdForUser(userId, accessToken) {
    const vendorsUrl = `https://api.emporix.io/vendor/${TENANT}/vendors`;

    const vendorsRes = await fetch(vendorsUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!vendorsRes.ok) {
        throw new Error('Fehler beim Laden der Vendors');
    }

    const vendors = await vendorsRes.json();

    for (const vendor of vendors) {
        const vendorId = vendor.id;
        const vendorName = vendor.name;
        const usersUrl = `https://api.emporix.io/iam/${TENANT}/users/vendors/${vendorId}`;

        const usersRes = await fetch(usersUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!usersRes.ok) {
            continue; // Wenn ein einzelner Call fehlschlägt, ignoriere ihn
        }

        const users = await usersRes.json();
        const match = users.find((u) => u.id === userId);

        if (match) {
            return {
                vendorId: vendorId,
                vendorName: vendorName
            };
        }
    }

    return null;
}

// Endpunkt: Liefert vendorId für eine userId
app.post('/api/vendor-id', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const { userId } = req.body;

    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized – invalid API key' });
    }

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const token = await getServiceToken();
        const vendor = await findVendorIdForUser(userId, token);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found for user' });
        }
        return res.json(vendor); // enthält vendorId UND vendorName



        return res.json({ vendorId });
    } catch (error) {
        console.error('❌ Fehler:', error);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/token', async (req, res) => {
    const apiKey = req.headers['x-api-key']
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized – invalid API key' })
    }

    try {
        const token = await getCustomEntityToken() // ruft den Token vom "harmlosen" Emporix-Key ab
        return res.json({ accessToken: token })
    } catch (err) {
        console.error('❌ Fehler beim Token holen:', err)
        return res.status(500).json({ error: 'Token fetch failed' })
    }
})

app.listen(PORT, () => {
    console.log(`🚀 Emporix Vendor Gateway läuft auf Port ${PORT}`);
});
