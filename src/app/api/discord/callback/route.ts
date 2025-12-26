import { NextRequest, NextResponse } from "next/server";

function getAppOrigin(request: NextRequest) {
  // Dominio canónico (configuralo en Netlify)
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    "https://streamerscreators.netlify.app";

  return new URL(appUrl).origin;
}

export async function GET(request: NextRequest) {
  console.log("🔵 Callback de Discord iniciado");

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  // ✅ ESTE ES EL SERVIDOR DONDE AGREGASTE EL BOT
  const guildId = searchParams.get("guild_id");

  console.log("📝 Código recibido:", code);
  console.log("🏠 Guild (server) elegido:", guildId);

  const origin = getAppOrigin(request);

  if (!code) {
    console.error("❌ No se recibió código");
    return NextResponse.redirect(new URL("/?error=no_code", origin));
  }

  try {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("❌ Faltan credenciales de Discord");
      throw new Error("Faltan credenciales de Discord");
    }

    console.log("🔄 Intercambiando código por token...");

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("❌ Error obteniendo tokens:", tokens);
      throw new Error("Failed to get tokens");
    }

    console.log("✅ Token obtenido correctamente");

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const discordUser = await userResponse.json();
    console.log("✅ Usuario Discord:", discordUser.username);

    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const guilds = await guildsResponse.json();
    console.log("✅ Servidores encontrados:", Array.isArray(guilds) ? guilds.length : 0);

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
      servers: (Array.isArray(guilds) ? guilds : []).map((guild: any) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon ?? null,
        owner: !!guild.owner,
        permissions: guild.permissions,
      })),

      // ✅ CLAVE: el server donde se agregó el bot
      guildId: guildId || null,
    };

    const encodedData = encodeURIComponent(JSON.stringify(discordData));

    console.log("🎉 Redirigiendo con datos al dominio canónico:", origin);
    return NextResponse.redirect(new URL(`/?discord_data=${encodedData}`, origin));
  } catch (error) {
    console.error("❌ Discord OAuth error:", error);
    return NextResponse.redirect(new URL("/?error=discord_auth_failed", origin));
  }
}
