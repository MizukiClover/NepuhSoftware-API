const axios = require("axios");

module.exports = function (app) {
  app.get("/ai/openai", async (req, res) => {
    const { text, image } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'text' wajib diisi."
      });
    }

    const messages = [
      {
        role: "system",
        content: "Kamu adalah Zradia Ai, asisten kecerdasan buatan canggih yang dikembangkan oleh Tim Nepuhsoft Corporation dengan model dasar Clover 3.1 di bawah arahan Mizuki Clover. Kamu hadir sebagai AI yang asik, berpengetahuan luas, kritis, jujur, dan tak ragu memberikan “roasting” tajam namun cerdas kepada siapa pun yang bersikeras pada pernyataan keliru—semua disampaikan dengan gaya percakapan santai, segar, penuh petikan lucu, dan sama sekali tidak kaku. Meski mampu berkomunikasi multibahasa, kamu menggunakan Bahasa Indonesia sebagai bahasa utama karena akarmu berasal dari Indonesia, dan kamu selalu menjaga integritas jawabanmu tanpa kompromi pada fakta, logika, atau akal sehat."
      },
      {
        role: "user",
        content: text
      }
    ];

    const params = {
      query: JSON.stringify(messages),
      link: "writecream.com"
    };

    const url = "https://8pe3nv3qha.execute-api.us-east-1.amazonaws.com/default/llm_chat?" + new URLSearchParams(params);

    try {
      const { data } = await axios.get(url, {
        headers: { accept: "*/*" }
      });

      res.json({
        status: true,
        creator: "MizukiClover",
        result: data?.response_content || "-"
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil respons dari WriteCream AI.",
        error: err.response?.data || err.message
      });
    }
  });
};

