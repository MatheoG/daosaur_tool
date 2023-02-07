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
let guild: Guild | undefined




export async function getWalletList() {
    let AddressList: string[] = []
    const sheetUrl = "https://docs.google.com/spreadsheets/d/1rgcsVSTellDkHmgE8rjtrrHFLpkGzsS2/gviz/tq?tqx=out:csv&sheet=Feuil1"
    const response = await axios.get(sheetUrl)
    const data = response.data
    let i = 0
    for (const line of data.split('\n')) {
        i++
        const address = line.split('"')[1].replace(" ", "").replace('\t', '')
        AddressList.push(address)
    }
    return AddressList
}

export async function getHours() {
    const sheetUrl = "https://docs.google.com/spreadsheets/d/1rgcsVSTellDkHmgE8rjtrrHFLpkGzsS2/gviz/tq?tqx=out:csv&sheet=Config&range=B1:B1"
    const response = await axios.get(sheetUrl)
    const data = response.data
    const hour = data.replace('"', '')
    return parseInt(hour)
}
export async function getWalletNb() {
    const sheetUrl = "https://docs.google.com/spreadsheets/d/1rgcsVSTellDkHmgE8rjtrrHFLpkGzsS2/gviz/tq?tqx=out:csv&sheet=Config&range=B2:B2"
    const response = await axios.get(sheetUrl)
    const data = response.data
    const walletNb = data.replace('"', '')
    return parseInt(walletNb)
}

let sellHistory: any[] = []
let buyHistory: any[] = []
let mintHistory: any[] = []
let MessageHistory: any[] = []



export async function sell(asset: any, address: string) {
    if (sellHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address)) {
        //update timestamp
        sellHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address).timestamp = Date.now()
    } else {
        sellHistory.push({
            adresse: address,
            asset_contract: asset.asset_contract.address,
            timestamp: Date.now(),
        })
    }
    const heure = await getHours()
    const AddressList = await getWalletList()
    const message = `Collection https://opensea.io/collection/${asset.collection.slug} was sold by ${sellHistory.length} wallets on ${AddressList.length} identified wallets!`
    //verifier si le message n'a pas deja ete envoye dans les 60 dernières minutes et si le nombre de wallet est superieur à 2
    const sellHistoryLast = sellHistory.filter((e) => e.timestamp > Date.now() - heure * 3600000 && e.asset_contract == asset.asset_contract.address)
    if (sellHistoryLast.length >= await getWalletNb() && !MessageHistory.find((e) => e.message == message && e.timestamp > Date.now() - 3600000)) {
        const channel = guild?.channels.cache.get(process.env.DISCORD_SELL_CHANNEL ? process.env.DISCORD_SELL_CHANNEL : "");
        if (channel && 'send' in channel) {
            channel.send(message)
        }
        MessageHistory.push({
            message: message,
            timestamp: Date.now()
        })
    }
}

export async function buy(asset: any, address: string) {
    if (buyHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address)) {
        //update timestamp
        buyHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address).timestamp = Date.now()
    } else {
        buyHistory.push({
            adresse: address,
            asset_contract: asset.asset_contract.address,
            timestamp: Date.now(),
        })
    }
    const heure = await getHours()
    const buyHistoryLast = buyHistory.filter((e) => e.timestamp > Date.now() - heure * 3600000 && e.asset_contract == asset.asset_contract.address)
    const AddressList = await getWalletList()
    const message = `Collection https://opensea.io/collection/${asset.collection.slug} was buy by ${buyHistoryLast.length} wallets on ${AddressList.length} identified wallets!`
    //verifier si le message n'a pas deja ete envoye dans les 60 dernières minutes et si le nombre de wallet est superieur à 2*

    if (buyHistoryLast.length >= await getWalletNb() && !MessageHistory.find((e) => e.message == message && e.timestamp > Date.now() - 3600000)) {
        const channel = guild?.channels.cache.get(process.env.DISCORD_BUY_CHANNEL ? process.env.DISCORD_BUY_CHANNEL : "");
        if (channel && 'send' in channel) {
            channel.send(message)
        }
        MessageHistory.push({
            message: message,
            timestamp: Date.now()
        })
    }
}

export async function mint(asset: any, address: string) {
    if (mintHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address)) {
        //update timestamp
        mintHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address).timestamp = Date.now()
    } else {
        //ajout dans l'historique
        mintHistory.push({
            adresse: address,
            asset_contract: asset.asset_contract.address,
            timestamp: Date.now(),
        })
    }
    const heure = await getHours()
    const mintHistoryLast = mintHistory.filter((e) => e.timestamp > Date.now() - heure * 3600000 && e.asset_contract == asset.asset_contract.address)
    const AddressList = await getWalletList()
    const message = `Collection https://opensea.io/collection/${asset.collection.slug} was minted by ${mintHistoryLast.length} wallets on ${AddressList.length} identified wallets!`
    //verifier si le message n'a pas deja ete envoye dans les 60 dernières minutes et si le nombre de wallet est superieur ou egal a 2
    if (mintHistoryLast.length >= await getWalletNb() && !MessageHistory.find((e) => e.message == message && e.timestamp > Date.now() - 3600000)) {
        const channel = guild?.channels.cache.get(process.env.DISCORD_MINT_CHANNEL ? process.env.DISCORD_MINT_CHANNEL : "");
        if (channel && 'send' in channel) {
            channel.send(`Collection https://opensea.io/collection/${asset.collection.slug} was minted by ${mintHistoryLast.length} wallets on ${AddressList.length} identified wallets!`)
        }
        MessageHistory.push({
            message: message,
            timestamp: Date.now()
        })
    }
}

trackWalletsAssets();


client.on('ready', () => {
    guild = client.guilds.cache.get('971028591359967232')
});;

config();
client.login(process.env.TOKEN);