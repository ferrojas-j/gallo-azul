async function run() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/hostaway/hostaway-api/master/swagger.json');
    if (res.ok) {
        const data = await res.json();
        const paths = Object.keys(data.paths);
        const matches = paths.filter(p => p.toLowerCase().includes('payment') || p.toLowerCase().includes('charge'));
        console.log("MATCHES:", matches);
    } else {
        console.log("Not found or error");
    }
  } catch (e) {
      console.log(e);
  }
}
run();
