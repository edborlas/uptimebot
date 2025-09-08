export const pingHost = async (url) => {
  const start = performance.now();
  try {
    await fetch(url, { mode: "no-cors" });
    const latency = Math.round(performance.now() - start);
    return { status: "up", latency };
  } catch (err) {
    return { status: "down", latency: null };
  }
};
