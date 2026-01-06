// claude-3.js - Scraper untuk MiniTool AI Claude-3 (Haiku)
// Mengambil jawaban dari https://minitoolai.com/Claude-3/
// Menggunakan bypass Cloudflare Turnstile via Nekolabs API

const axios = require('axios');
const { URLSearchParams } = require('url');

/**
 * Mengirim pertanyaan ke Claude-3 Haiku melalui MiniTool AI dan mengembalikan respons.
 * @param {string} question - Pertanyaan yang ingin diajukan ke Claude.
 * @returns {Promise<string>} - Jawaban dari Claude-3.
 */
async function claude3(question) {
    if (!question || typeof question !== 'string') {
        throw new Error('Parameter "question" diperlukan dan harus berupa string.');
    }

    try {
        // 1. Ambil halaman utama untuk mendapatkan utoken dan cookie
        const {  html, headers } = await axios.get('https://minitoolai.com/Claude-3/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
            }
        });

        // Ekstrak utoken dari HTML
        const utokenMatch = html.match(/var\s+utoken\s*=\s*"([^"]*)"/);
        const utoken = utokenMatch ? utokenMatch[1] : null;
        if (!utoken) throw new Error('Gagal mengekstrak utoken dari halaman.');

        // Gabungkan cookie dari respons (jika ada)
        const cookies = headers['set-cookie'] ? headers['set-cookie'].join('; ') : '';

        // 2. Dapatkan token Cloudflare Turnstile dari Nekolabs API
        const cfResponse = await axios.post(
            'https://api.nekolabs.web.id/tls/bypass/cf-turnstile',
            {
                url: 'https://minitoolai.com/Claude-3/',
                siteKey: '0x4AAAAAABjI2cBIeVpBYEFi'
            },
            { timeout: 10000 }
        );

        const cfToken = cfResponse.data?.result;
        if (!cfToken) throw new Error('Gagal mendapatkan token Cloudflare Turnstile.');

        // 3. Kirim permintaan ke claude3_stream.php
        const postData = new URLSearchParams({
            messagebase64img1: '',
            messagebase64img0: '',
            select_model: 'claude-3-haiku-20240307',
            temperature: '0.7',
            utoken: utoken,
            message: question,
            umes1a: '',
            bres1a: '',
            umes2a: '',
            bres2a: '',
            cft: encodeURIComponent(cfToken)
        }).toString();

        const {  streamToken } = await axios.post(
            'https://minitoolai.com/Claude-3/claude3_stream.php',
            postData,
            {
                headers: {
                    'Accept': '*/*',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Origin': 'https://minitoolai.com',
                    'Referer': 'https://minitoolai.com/Claude-3/',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cookie': cookies
                },
                timeout: 15000
            }
        );

        if (!streamToken || typeof streamToken !== 'string') {
            throw new Error('Tidak menerima stream token dari server.');
        }

        // 4. Ambil stream respons
        const {  streamData } = await axios.get(
            'https://minitoolai.com/Claude-3/claude3_stream.php',
            {
                headers: {
                    'Accept': '*/*',
                    'Origin': 'https://minitoolai.com',
                    'Referer': 'https://minitoolai.com/Claude-3/',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cookie': cookies
                },
                params: { streamtoken: streamToken.trim() },
                timeout: 20000
            }
        );

        // 5. Parsing SSE (Server-Sent Events)
        const lines = streamData.split('\n').filter(line => line.trim() && line.startsWith(' {'));
        let fullResponse = '';

        for (const line of lines) {
            try {
                const jsonPart = JSON.parse(line.substring(5)); // 'data: ' = 6 chars, tapi ada spasi → 5
                if (jsonPart.type === 'content_block_delta' && jsonPart.delta?.text) {
                    fullResponse += jsonPart.delta.text;
                }
            } catch (e) {
                // Abaikan baris yang tidak valid
                continue;
            }
        }

        if (!fullResponse.trim()) {
            throw new Error('Tidak ada konten yang diterima dari stream.');
        }

        return fullResponse.trim();
    } catch (error) {
        // Tangani error dengan pesan yang jelas
        const message = error.response?.data?.message || error.message || 'Terjadi kesalahan tak dikenal.';
        throw new Error(`[Claude-3 Scraper Error]: ${message}`);
    }
}

// Ekspor fungsi untuk digunakan di tempat lain
module.exports = claude3;
