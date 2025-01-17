import { encode as base64encode } from 'base-64';

const SPOTIFY_CLIENT_ID = 'efed5dbdb12148e089a0a2dadb5be433';
const SPOTIFY_CLIENT_SECRET = '85092231380547d58f398a3f7cc8227e';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_ENDPOINT = 'https://api.spotify.com/v1';

export async function getSpotifyAccessToken() {
  try {
    const basic = base64encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
    
    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
}

export async function getShowEpisodes(token: string, showId: string) {
  try {
    const response = await fetch(
      `${SPOTIFY_API_ENDPOINT}/shows/${showId}/episodes?market=NO&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data;
  } catch (error) {
    console.error('Error fetching show episodes:', error);
    throw error;
  }
}