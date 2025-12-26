import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(
    process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/discord/callback'
  );
  
  if (!clientId) {
    return NextResponse.json(
      { error: 'Discord Client ID no configurado' },
      { status: 500 }
    );
  }
  
  // Agregar 'bot' al scope para que también agregue el bot al servidor
  const scope = 'identify guilds bot';
  
  // Permisos del bot (View Channels, Send Messages, Embed Links, Attach Files, Read Message History)
  const permissions = '117760';
  
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&permissions=${permissions}`;
  
  return NextResponse.redirect(discordAuthUrl);
}