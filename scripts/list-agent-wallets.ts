import fs from 'fs';
import path from 'path';
import { AgentSpec } from '../lib/agents/spec';

// Load .env.local manually BEFORE importing wallet module
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (trimmed.startsWith('#') || !trimmed) return;

        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) return;

        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key && value) {
            process.env[key] = value;
        }
    });
}

const AGENTS_DIR = path.join(process.cwd(), 'data', 'agents');

async function listAgentWallets() {
    console.log('🔍 Scanning agent wallets...\n');

    if (!fs.existsSync(AGENTS_DIR)) {
        console.error(`❌ Agents directory not found: ${AGENTS_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
        console.log('No agent files found.');
        return;
    }

    console.log(`Found ${files.length} agent(s)\n`);
    console.log('─'.repeat(80));
    console.log(`${'Agent Name'.padEnd(30)} ${'Address'.padEnd(42)} ${'Balance (MON)'.padStart(20)}`);
    console.log('─'.repeat(80));

    const results = await Promise.all(
        files.map(async (file) => {
            try {
                const filePath = path.join(AGENTS_DIR, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const agent: AgentSpec = JSON.parse(content);

                const address = agent.wallet?.address;
                if (!address) {
                    return {
                        name: agent.name || file,
                        address: 'N/A',
                        balance: '0',
                        error: 'No wallet address'
                    };
                }

                try {
                    // Dynamic import after env vars are loaded
                    const { getAgentBalance } = await import('../lib/thirdweb/wallet');
                    const balance = await getAgentBalance(address);
                    // Convert from wei to MON (18 decimals)
                    const balanceValue = typeof balance.value === 'bigint'
                        ? balance.value
                        : BigInt(balance.value);
                    const divisor = BigInt(10 ** 18);
                    const wholePart = balanceValue / divisor;
                    const remainder = balanceValue % divisor;
                    const balanceInMon = Number(wholePart) + Number(remainder) / Number(divisor);
                    return {
                        name: agent.name || file,
                        address,
                        balance: balanceInMon.toFixed(6),
                        error: null
                    };
                } catch (error: any) {
                    return {
                        name: agent.name || file,
                        address,
                        balance: 'Error',
                        error: error.message || 'Failed to fetch balance'
                    };
                }
            } catch (error: any) {
                return {
                    name: file,
                    address: 'N/A',
                    balance: 'Error',
                    error: error.message || 'Failed to parse file'
                };
            }
        })
    );

    // Sort by balance (descending)
    results.sort((a, b) => {
        if (a.error || b.error) return 0;
        return parseFloat(b.balance) - parseFloat(a.balance);
    });

    let totalBalance = 0;
    results.forEach((result) => {
        const name = result.name.padEnd(30);
        const address = result.address.padEnd(42);
        const balance = result.error ? result.error.padStart(20) : parseFloat(result.balance).toFixed(6).padStart(20);

        console.log(`${name} ${address} ${balance}`);

        if (!result.error) {
            totalBalance += parseFloat(result.balance);
        }
    });

    console.log('─'.repeat(80));
    console.log(`${'TOTAL'.padEnd(30)} ${''.padEnd(42)} ${totalBalance.toFixed(6).padStart(20)} MON`);
    console.log('─'.repeat(80));
}

listAgentWallets().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});

