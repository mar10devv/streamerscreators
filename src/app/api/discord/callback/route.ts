import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔵 Callback de Discord iniciado');
  
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  console.log('📝 Código recibido:', code);
  
  if (!code) {
    console.error('❌ No se recibió código');
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Faltan credenciales de Discord');
      throw new Error('Faltan credenciales de Discord');
    }

    console.log('🔄 Intercambiando código por token...');

    // Intercambiar el código por un access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('❌ Error obteniendo tokens:', tokens);
      throw new Error('Failed to get tokens');
    }

    console.log('✅ Token obtenido correctamente');

    // Obtener información del usuario de Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const discordUser = await userResponse.json();
    console.log('✅ Usuario Discord:', discordUser.username);

    // Obtener los servidores del usuario
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const guilds = await guildsResponse.json();
    console.log('✅ Servidores encontrados:', guilds.length);

    // Crear objeto de respuesta para guardar en sessionStorage
    const discordData = {
      user: {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
      },
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      servers: guilds.map((guild: any) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
        permissions: guild.permissions,
      })),
    };

    // Codificar los datos para pasarlos por URL
    const encodedData = encodeURIComponent(JSON.stringify(discordData));
    
    console.log('🎉 Redirigiendo con datos...');
    return NextResponse.redirect(
      new URL(`/?discord_data=${encodedData}`, request.url)
    );
    
  } catch (error) {
    console.error('❌ Discord OAuth error:', error);
    return NextResponse.redirect(
      new URL('/?error=discord_auth_failed', request.url)
    );
  }
}