export async function POST(req) {
  try {
    const { text, lang } = await req.json();

    if (!text || !lang || lang === "en") {
      return Response.json({ text: text || "", lang: "en" });
    }

    const itcMap = {
      te: "te-t-i0-und",
      ta: "ta-t-i0-und",
      kn: "kn-t-i0-und",
      hi: "hi-t-i0-und",
    };

    const itc = itcMap[lang];
    if (!itc) {
      return Response.json({ text, lang });
    }

    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=${itc}&num=1`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0] === "SUCCESS" && Array.isArray(data[1])) {
        const words = data[1].map((item) => (item[1] && item[1][0] ? item[1][0] : item[0]));
        return Response.json({ text: words.join(" "), lang });
      }
    }

    return Response.json({ text, lang });
  } catch (error) {
    console.warn("Transliteration route error:", error);
    return Response.json({ text: "", lang: "en" });
  }
}

