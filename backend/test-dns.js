import dns from 'dns/promises';

const host = 'akshay-cluster.ad88syw.mongodb.net';

async function checkDNS() {
    try {
        const srv = await dns.resolveSrv(`_mongodb._tcp.${host}`);
        console.log('SRV records:', srv);

        const txt = await dns.resolveTxt(host);
        console.log('TXT records:', txt);
    } catch (err) {
        console.error('DNS error:', err);
    }
}

checkDNS();
