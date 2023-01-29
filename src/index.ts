import axios from "axios";
import { time } from "console";
import exp from "constants";
import { trackWalletsAssets, getContract } from "./opensea";
import {
    GatewayIntentBits,
    Client,
    Colors,
    ChannelType,
    PermissionFlagsBits,
    Partials,
    PermissionsBitField,
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    TextInputStyle,
    ButtonStyle,
    DiscordAPIError,
    Attachment,
    Interaction,
    CommandInteraction,
    Guild
} from 'discord.js'
import { config } from "dotenv";

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildInvites
]


const client = new Client({ intents: intents, partials: [Partials.Message, Partials.Channel, Partials.Reaction] });
//get Address list
let AddressList: string[] = []
let guild: Guild | undefined

const sheetUrl = "https://docs.google.com/spreadsheets/d/1rgcsVSTellDkHmgE8rjtrrHFLpkGzsS2/gviz/tq?tqx=out:csv&sheet=Feuil1"
axios.get(sheetUrl).then(async (response) => {
    const data = await response.data
    let i = 0
    for (const line of data.split('\n')) {
        i++
        const address = line.split('"')[1].replace(" ", "").replace('\t', '')
        AddressList.push(address)
    }
    //AddressList = ['0xAF0bF449840aE803cB1F9ECdb8e14E57086269D6', '0x4e21da6a36213b6d1a5330efad5223a88f00aa2c']
    trackWalletsAssets(AddressList);
});



let collectionBuyHistory: any = []
let collectionSellHistory: any = []
let collectionMintHistory: any = []
const heure = 48


export async function sell(asset: any) {
    // let i = collectionSellHistory.length - 1
    // let nb = 1
    // while (i >= 0 && collectionSellHistory[i].timestamp > Date.now() - heure * 3600000) {
    //     if (collectionSellHistory[i].asset_contract == asset.asset_contract.address) {
    //         nb++
    //     }
    //     i--
    // }
    // if(nb >= 2){
        const channel = guild?.channels.cache.get(process.env.DISCORD_SELL_CHANNEL ? process.env.DISCORD_SELL_CHANNEL : "");
        if (channel && 'send' in channel) {
            channel.send(`New sell in last 48 hours of ${asset.asset_contract.name} (https://opensea.io/collection/${asset.collection.slug})`)
        }
    // }
    // collectionSellHistory.push({
    //     asset_contract: asset.asset_contract.address,
    //     timestamp: Date.now(),
    // })
}

export async function buy(asset: any) {
    // let i = collectionBuyHistory.length - 1
    // let nb = 1
    // while (i >= 0 && collectionBuyHistory[i].timestamp > Date.now() - heure * 3600000) {
    //     if (collectionBuyHistory[i].asset_contract == asset.asset_contract.address) {
    //         nb++
    //     }
    //     i--
    // }
    // if (nb >= 2) {
        const channel = guild?.channels.cache.get(process.env.DISCORD_BUY_CHANNEL ? process.env.DISCORD_BUY_CHANNEL : "");
        if (channel && 'send' in channel) {
            channel.send(`New buy in last 48 hours of ${asset.asset_contract.name} (https://opensea.io/collection/${asset.collection.slug})`)
        }
    // }
    // collectionBuyHistory.push({
    //     asset_contract: asset.asset_contract.address,
    //     timestamp: Date.now(),
    // })
}

export async function mint(asset: any) {
    // let i = collectionMintHistory.length - 1
    // let nb = 1
    // while (i >= 0 && collectionMintHistory[i].timestamp > Date.now() - heure * 3600000) {
    //     if (collectionMintHistory[i].asset_contract == asset.asset_contract.address) {
    //         nb++
    //     }
    //     i--
    // }
    // if(nb >= 2){
         const channel = guild?.channels.cache.get(process.env.DISCORD_MINT_CHANNEL ? process.env.DISCORD_MINT_CHANNEL : "");
         if (channel && 'send' in channel) {
             channel.send(`New mints in last 48 hours of ${asset.asset_contract.name} (https://opensea.io/collection/${asset.collection.slug})`)
         }
    // }
    // collectionMintHistory.push({
    //     asset_contract: asset.asset_contract.address,
    //     timestamp: Date.now(),
   // })
}

client.on('ready', () => {
    guild = client.guilds.cache.get('971028591359967232')
});;

config();
client.login(process.env.TOKEN);