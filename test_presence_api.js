(async () => {
  try {
    const res = await fetch("http://localhost:3000/api/presence", {
      headers: {
        "x-user-id": "test-user-id-123",
        "Content-Type": "application/json"
      }
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (err) {
    console.error("Error:", err);
  }
})();
