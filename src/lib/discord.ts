import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

export interface DiscordServer {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export interface DiscordUserData {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

export async function saveDiscordConnection(
  firebaseUid: string,
  discordData: {
    user: DiscordUserData;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    servers: DiscordServer[];
  }
) {
  await setDoc(
    doc(db, 'users', firebaseUid),
    {
      discord: {
        user: discordData.user,
        connectedAt: new Date().toISOString(),
      },
      discordTokens: {
        accessToken: discordData.accessToken,
        refreshToken: discordData.refreshToken,
        expiresAt: new Date(Date.now() + discordData.expiresIn * 1000).toISOString(),
      },
      discordServers: discordData.servers,
    },
    { merge: true }
  );
}

export async function getDiscordConnection(firebaseUid: string) {
  const docRef = doc(db, 'users', firebaseUid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

export async function saveSelectedChannel(
  firebaseUid: string,
  serverId: string,
  channelId: string,
  serverName: string,
  channelName: string
) {
  await setDoc(
    doc(db, 'users', firebaseUid),
    {
      selectedServer: {
        id: serverId,
        name: serverName,
      },
      selectedChannel: {
        id: channelId,
        name: channelName,
      },
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getDiscordChannels(
  accessToken: string,
  serverId: string
): Promise<DiscordChannel[]> {
  const response = await fetch(
    `https://discord.com/api/guilds/${serverId}/channels`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch channels');
  }

  const channels = await response.json();
  // Filtrar solo canales de texto (type 0)
  return channels.filter((ch: DiscordChannel) => ch.type === 0);
}