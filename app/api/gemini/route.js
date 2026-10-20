import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { emailText, question } = await req.json();

        if (!emailText || !question) {
            return NextResponse.json({ error: "Missing emailText or question" }, { status: 400 });
        }

        // Truncate to stay within context limits
        const trimmedEmail = emailText.slice(0, 12000);

        const geminiKey = process.env.GEMINI_API_KEY;
        const sarvamKey = process.env.SARVAM_API_KEY;
        const groqKey = process.env.GROQ_API_KEY;
        const openRouterKey =
            process.env.OPENROUTER_API_KEY_HUNTER ||
            process.env.OPENROUTER_API_KEY_GPT_OSS ||
            process.env.OPENROUTER_API_KEY_NEMOTRON;

        const isConfigured = (k) => k && !k.startsWith("your_");

        // 1. Try Sarvam first if configured (fastest response time: ~400ms)
        if (isConfigured(sarvamKey)) {
            try {
                const timeoutSignal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;
                const sarvamResp = await fetch("https://api.sarvam.ai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "api-subscription-key": sarvamKey,
                    },
                    body: JSON.stringify({
                        model: "sarvam-105b-conversations",
                        messages: [
                            {
                                role: "system",
                                content: "You are an intelligent email assistant. Answer questions about the email clearly and helpfully. Be concise but thorough.",
                            },
                            {
                                role: "user",
                                content: `Here is the email:\n\n${trimmedEmail}\n\nUser question: ${question}`,
                            },
                        ],
                        temperature: 0.5,
                        max_tokens: 1024,
                    }),
                    signal: timeoutSignal,
                });

                if (sarvamResp.ok) {
                    const data = await sarvamResp.json();
                    const reply = data.choices?.[0]?.message?.content || "No response generated.";
                    return NextResponse.json({ reply });
                } else {
                    const errText = await sarvamResp.text();
                    console.warn("[Ask AI] Sarvam error, trying fallback:", sarvamResp.status, errText);
                }
            } catch (sarvamErr) {
                console.warn("[Ask AI] Sarvam fetch error:", sarvamErr.message);
            }
        }

        // 2. Try Gemini if configured (with timeout)
        if (isConfigured(geminiKey)) {
            try {
                const timeoutSignal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;
                const geminiResp = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            text: `Here is the email:\n\n${trimmedEmail}\n\nUser question: ${question}`,
                                        },
                                    ],
                                },
                            ],
                            systemInstruction: {
                                parts: [
                                    {
                                        text: "You are an intelligent email assistant. Answer questions about the email clearly and helpfully. Be concise but thorough.",
                                    },
                                ],
                            },
                            generationConfig: {
                                temperature: 0.5,
                                maxOutputTokens: 1024,
                            },
                        }),
                        signal: timeoutSignal,
                    }
                );

                if (geminiResp.ok) {
                    const data = await geminiResp.json();
                    const reply =
                        data.candidates?.[0]?.content?.parts?.[0]?.text ||
                        "No response generated.";
                    return NextResponse.json({ reply });
                } else {
                    const errText = await geminiResp.text();
                    console.warn("[Ask AI] Gemini error, trying fallback:", geminiResp.status, errText);
                }
            } catch (geminiErr) {
                console.warn("[Ask AI] Gemini fetch error:", geminiErr.message);
            }
        }

        // 3. Try Groq if configured
        if (isConfigured(groqKey)) {
            try {
                const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${groqKey}`,
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            {
                                role: "system",
                                content: "You are an intelligent email assistant. Answer questions about the email clearly and helpfully. Be concise but thorough.",
                            },
                            {
                                role: "user",
                                content: `Here is the email:\n\n${trimmedEmail}\n\nUser question: ${question}`,
                            },
                        ],
                        temperature: 0.5,
                        max_tokens: 1024,
                    }),
                });

                if (groqResp.ok) {
                    const data = await groqResp.json();
                    const reply = data.choices?.[0]?.message?.content || "No response generated.";
                    return NextResponse.json({ reply });
                }
            } catch (groqErr) {
                console.warn("[Ask AI] Groq fetch error:", groqErr.message);
            }
        }

        // 4. Try OpenRouter if configured
        if (isConfigured(openRouterKey)) {
            try {
                const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${openRouterKey}`,
                        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
                        "X-Title": "Scasi-AI",
                    },
                    body: JSON.stringify({
                        model: "meta-llama/llama-3.1-8b-instruct:free",
                        messages: [
                            {
                                role: "system",
                                content: "You are an intelligent email assistant. Answer questions about the email clearly and helpfully. Be concise but thorough.",
                            },
                            {
                                role: "user",
                                content: `Here is the email:\n\n${trimmedEmail}\n\nUser question: ${question}`,
                            },
                        ],
                        temperature: 0.5,
                        max_tokens: 1024,
                    }),
                });

                if (resp.ok) {
                    const data = await resp.json();
                    const reply = data.choices?.[0]?.message?.content || "No response generated.";
                    return NextResponse.json({ reply });
                }
            } catch (orErr) {
                console.warn("[Ask AI] OpenRouter fetch error:", orErr.message);
            }
        }

        return NextResponse.json(
            {
                error:
                    "No AI API key configured. Please set SARVAM_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in .env.local",
            },
            { status: 500 }
        );
    } catch (err) {
        console.error("[Ask AI] Error:", err);
        return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
    }
}
