import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { serverId } = await request.json();

    console.log('🔍 Request recibido para canales');
    console.log('  Server ID:', serverId);

    if (!serverId) {
      console.error('❌ Falta serverId');
      return NextResponse.json(
        { error: 'Missing serverId' },
        { status: 400 }
      );
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    
    if (!botToken) {
      console.error('❌ Falta DISCORD_BOT_TOKEN en .env.local');
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 500 }
      );
    }

    console.log('📡 Llamando a Discord API con Bot Token...');
    const response = await fetch(
      `https://discord.com/api/guilds/${serverId}/channels`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    console.log('📦 Respuesta de Discord:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error de Discord API:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch channels', details: errorData },
        { status: response.status }
      );
    }

    const channels = await response.json();
    console.log('📋 Total canales recibidos:', channels.length);
    
    // Filtrar solo canales de texto (type 0)
    const textChannels = channels.filter((ch: any) => ch.type === 0);
    console.log('✅ Canales de texto:', textChannels.map((c: any) => `#${c.name}`).join(', '));

    return NextResponse.json({ channels: textChannels });
  } catch (error) {
    console.error('❌ Error completo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}