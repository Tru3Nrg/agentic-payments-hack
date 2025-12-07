async function checkMONPrice() {
    try {
        console.log('Checking MON/USD price from Coinbase...');

        const pair = 'MON-USD';
        const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`);

        if (!res.ok) {
            throw new Error(`Coinbase API error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();

        if (data.data) {
            console.log('✅ Success!');
            console.log(`Price: $${data.data.amount}`);
            console.log(`Currency: ${data.data.base} / ${data.data.currency}`);
            console.log(`Source: Coinbase`);
        } else {
            console.error('Unexpected response format:', data);
            process.exit(1);
        }
    } catch (error: any) {
        console.error('Failed to fetch MON/USD price:', error.message);
        process.exit(1);
    }
}

checkMONPrice();

