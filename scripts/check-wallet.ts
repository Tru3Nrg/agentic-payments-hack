
import fs from 'fs';
import path from 'path';
import { createThirdwebClient } from 'thirdweb';
import { privateKeyToAccount } from 'thirdweb/wallets';

// Load .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || 'mock',
    secretKey: process.env.THIRDWEB_SECRET_KEY
});

const key = process.env.MASTER_PRIVATE_KEY;
if (key) {
    try {
        const account = privateKeyToAccount({ client, privateKey: key });
        console.log('Address:', account.address);
    } catch (e) {
        console.error("Invalid key:", e);
    }
} else {
    console.log('No key');
}
