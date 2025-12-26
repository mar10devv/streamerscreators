import { NextRequest, NextResponse } from 'next/server';

// Lista de mensajes aleatorios
const mensajesAleatorios = [
  "Mira este video bro😱😱",
  "Mira esto jaajaj😂",
  "Tenés que ver esto🔥",
  "JAJAJA mirá esto😭",
  "No puedo creer lo que vi🤯",
  "Esto está buenísimo🎬",
  "Che mirá este video💯",
  "WTF con esto😱",
  "Reacciona a este video porfa🙏",
  "Esto es oro puro✨"
];

function getMensajeAleatorio(): string {
  const indice = Math.floor(Math.random() * mensajesAleatorios.length);
  return mensajesAleatorios[indice];
}

export async function POST(request: NextRequest) {
  try {
    const { channelId, message } = await request.json();

    if (!channelId || !message) {
      return NextResponse.json(
        { error: 'Missing channelId or message' },
        { status: 400 }
      );
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    
    if (!botToken) {
      console.error('❌ Falta DISCORD_BOT_TOKEN');
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 500 }
      );
    }

    // Seleccionar mensaje aleatorio
    const mensajeAleatorio = getMensajeAleatorio();
    const mensajeCompleto = `${mensajeAleatorio}\n${message}`;

    console.log('📤 Enviando mensaje al canal:', channelId);
    console.log('💬 Mensaje:', mensajeCompleto);

    // Enviar mensaje a Discord
    const response = await fetch(
      `https://discord.com/api/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: mensajeCompleto,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error de Discord API:', errorData);
      return NextResponse.json(
        { error: 'Failed to send message', details: errorData },
        { status: response.status }
      );
    }

    const messageData = await response.json();
    console.log('✅ Mensaje enviado:', mensajeAleatorio);

    return NextResponse.json({ 
      success: true, 
      messageId: messageData.id,
      randomMessage: mensajeAleatorio
    });

  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
