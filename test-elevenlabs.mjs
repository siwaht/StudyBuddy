import { storage } from './server/storage.js';
import { decrypt } from './server/utils/crypto.js';

async function testElevenLabsAPI() {
  console.log('\n=== Testing ElevenLabs API Connection ===\n');
  
  try {
    // Get ElevenLabs accounts
    const accounts = await storage.getAccountsByService('elevenlabs');
    console.log(`Found ${accounts.length} ElevenLabs account(s)`);
    
    if (accounts.length === 0) {
      console.log('No ElevenLabs accounts found in database');
      return;
    }
    
    const account = accounts.find(a => a.isActive) || accounts[0];
    console.log('Using account:', account.id);
    console.log('Account active:', account.isActive);
    
    // Decrypt API key
    const apiKey = decrypt(account.encryptedApiKey);
    console.log('API key length:', apiKey.length);
    console.log('API key starts with:', apiKey.substring(0, 10) + '...');
    
    // Clean the API key
    const cleanedKey = apiKey.trim().replace(/[\r\n\t]/g, '').replace(/[^\x20-\x7E]/g, '');
    console.log('Cleaned API key length:', cleanedKey.length);
    
    // Test the API key by fetching agents
    console.log('\n=== Testing API Key ===');
    const agentsResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: {
        'xi-api-key': cleanedKey
      }
    });
    
    console.log('Agents API response status:', agentsResponse.status);
    
    if (agentsResponse.ok) {
      const agents = await agentsResponse.json();
      console.log('Successfully fetched agents. Count:', agents.agents?.length || 0);
      
      // Now test fetching the specific conversation
      const conversationId = 'conv_4101k528p9s5fd9s4ca480dmbsce';
      console.log(`\n=== Testing Conversation Fetch: ${conversationId} ===`);
      
      const convResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          headers: {
            'xi-api-key': cleanedKey
          }
        }
      );
      
      console.log('Conversation API response status:', convResponse.status);
      
      if (convResponse.ok) {
        const conversation = await convResponse.json();
        console.log('\n=== Conversation Data ===');
        console.log('Conversation ID:', conversation.conversation_id);
        
        // Check all fields related to audio/recording
        const audioFields = Object.keys(conversation).filter(k => 
          k.toLowerCase().includes('audio') || 
          k.toLowerCase().includes('recording') || 
          k.toLowerCase().includes('media') ||
          k.toLowerCase().includes('url')
        );
        
        console.log('\nAudio-related fields found:', audioFields);
        
        for (const field of audioFields) {
          const value = conversation[field];
          if (typeof value === 'string' && value.length > 100) {
            console.log(`  ${field}: [long string, ${value.length} chars]`);
          } else {
            console.log(`  ${field}:`, value);
          }
        }
        
        // Check if there's a has_audio field
        if ('has_audio' in conversation) {
          console.log('has_audio field:', conversation.has_audio);
        }
        
        // List all fields for debugging
        console.log('\nAll conversation fields:', Object.keys(conversation));
        
        // Try to fetch audio directly
        console.log('\n=== Testing Audio Endpoint ===');
        const audioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
        console.log('Fetching audio from:', audioUrl);
        
        const audioResponse = await fetch(audioUrl, {
          headers: {
            'xi-api-key': cleanedKey,
            'Accept': 'audio/mpeg'
          }
        });
        
        console.log('Audio endpoint status:', audioResponse.status);
        console.log('Audio content-type:', audioResponse.headers.get('content-type'));
        
        if (audioResponse.ok) {
          const contentLength = audioResponse.headers.get('content-length');
          console.log('Audio size:', contentLength, 'bytes');
          console.log('SUCCESS: Audio is available!');
        } else {
          const errorText = await audioResponse.text();
          console.log('Audio endpoint error:', errorText);
          
          // Try with format parameter
          console.log('\n=== Testing Audio with format=mp3 ===');
          const audioUrlWithFormat = `${audioUrl}?format=mp3`;
          const audioResponse2 = await fetch(audioUrlWithFormat, {
            headers: {
              'xi-api-key': cleanedKey,
              'Accept': 'audio/mpeg'
            }
          });
          
          console.log('Audio with format status:', audioResponse2.status);
          if (audioResponse2.ok) {
            const contentLength = audioResponse2.headers.get('content-length');
            console.log('Audio size:', contentLength, 'bytes');
            console.log('SUCCESS: Audio is available with format parameter!');
          }
        }
        
      } else {
        const errorText = await convResponse.text();
        console.log('Conversation fetch error:', errorText);
      }
      
    } else {
      const errorText = await agentsResponse.text();
      console.log('API key test failed:', errorText);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    process.exit(0);
  }
}

testElevenLabsAPI();