async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/debug-auth');
    const text = await res.text();
    console.log(res.status, text.substring(0, 200));
  } catch (e) {
    console.error(e);
  }
}
run();
