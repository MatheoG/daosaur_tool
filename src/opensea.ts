import axios from 'axios';
import { config } from 'dotenv';
import { asset } from './interface';
import { sell, buy, mint } from '.';
import fs from 'fs';

async function getAdresseAsset(address:string){
    const openseaUrl = 'https://api.opensea.io/api/v1/assets'
    let assets: asset[] = []
    let cursor = ''
    let error = false;
    //on boucle jusqu'a ce qu'il n'y ait plus d'erreur
    do {
        await axios.get(openseaUrl, {
            headers: {
                'X-API-KEY': process.env.OPENSEA_API_KEY
            },
            params: {
                owner: address,
                limit: 200,
                cursor: cursor,
            }
        })
        .then(async (response) => {
            //console.log(response.data)
            if(response.status == 200){
                assets.push(...response.data.assets)
                cursor = response.data.next
            }else{
                console.log("Erreur lors de la requete de récupération des assets")
                error = true
            }
        })
        .catch(async (error) => {
            console.log("Erreur lors de la requete de récupération des assets")
            error = true
        });
        await new Promise(r => setTimeout(r, 4000));
    } while (cursor && !error)
    return assets
}

//recuperation des assets pour chaque adresse
export async function getWalletsAssets(walletList: string[]) {
    let adressAssets: any = {}
    let i = 0
    for (const address of walletList) {
        i++
        const AddAsset = await getAdresseAsset(address)
        console.log('Adresse: ' + i + '/' + walletList.length + ' - Nombre d\'asset pour ' + address + ': ' + AddAsset.length)
        adressAssets[address] = AddAsset
    }
    return adressAssets
}
export async function trackWalletsAssets(walletList: string[]) {
    console.log('Tracking lancé le ' + new Date().toLocaleString());
    const oldWalletFile = '' // fs.readFileSync('./oldWallet.json', 'utf8')
    let oldWalletAsset = oldWalletFile.length>0 ? JSON.parse(oldWalletFile) : await getWalletsAssets(walletList)
    while (true) {
        console.log('Checking...')
        const walletAsset = await getWalletsAssets(walletList)
        for(const address of walletList){
            //console.log('Nombre d\'asset pour ' + address + ': ' + walletAsset[address].length)
            //nand pour voir les asset different entre l'ancienne liste et la nouvelle
            let nandList = oldWalletAsset[address]
                .filter((item: asset) => !walletAsset[address].some((z: asset) => z.id === item.id))
                .concat(walletAsset[address].filter((item: asset) => !oldWalletAsset[address].some((z: asset) => z.id === item.id)));
            console.log("pour l'adresse " + address + " - " +nandList.length + ' asset(s) ont changé');
            //si il y a des assets qui ont changé mais pas plus de 100 (pour eviter les erreurs)
            if (nandList.length > 0 && nandList.length < 100) {
                for (const asset of nandList) {
                    //pour chaque asset qui a changé on recupere les evenements
                    const openseaUrl = 'https://api.opensea.io/api/v1/events'
                    let error = false           
                    let eventType = ''
                    let cursor:string | null = null
                    //on boucle jusqu'a ce qu'il n'y ait plus d'erreur       
                    do{
                            await new Promise(resolve => setTimeout(resolve, 4000));
                            await axios.get(openseaUrl, {
                                headers: {
                                    'X-API-KEY': process.env.OPENSEA_API_KEY
                                },
                                params: {
                                    asset_contract_address: asset.asset_contract.address,
                                    token_id: asset.token_id,
                                    limit: 200,
                                    cursor: cursor,
                                },
                            })
                            .then(async (response) => {
                                if(response.status != 200){
                                    const data = await response?.data
                                    let event: any = ''
                                    let y = 0
                                    cursor = response?.data?.next
                                    //on recupere le dernier evenement
                                    while (event?.event_type != 'successful' && event?.event_type != 'transfer') {
                                        event = response?.data.asset_events[y]
                                        y++;
                                    }
                                    //si c'est un achat ou une vente
                                    if (event.event_type == 'successful') {
                                        //si l'asset est dans l'ancienne liste c'est une vente
                                        if (asset in oldWalletAsset[address]) {
                                            eventType = 'sell'
                                        }
                                        //si l'asset est dans la nouvelle liste c'est un achat
                                        else {
                                            eventType = 'buy'
                                        }
                                        //si c'est un transfert
                                    } else {
                                        //si l'asset est dans l'ancienne liste c'est un envoi
                                        if (asset in oldWalletAsset[address]) {
                                            eventType = 'send'
                                            //si l'asset est dans la nouvelle liste c'est un asset reçu
                                        } else {
                                            //si il provient d'une adresse vide c'est un mint
                                            if (event.from_account.address == '0x0000000000000000000000000000000000000000') {
                                                eventType = 'mint'
                                                //sinon c'est un airdrop
                                            } else {
                                                eventType = 'airdrop'
                                            }
                                        }
                                    }
                                    eventType = event?.event_type
                                    error = false
                                }else{
                                    console.log("Erreur lors de la requete de récupération des events")
                                    error = true
                                }
                            })
                            .catch(async (error) => {
                                console.log("Erreur lors de la requete de récupération des events")
                                error = true
                            })

                    }while(error || cursor)
                    if(eventType == 'sell'){
                        console.log('Vente de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString())
                        sell(asset)
                    }else if(eventType == 'buy'){
                        console.log('Achat de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString())
                        buy(asset)
                    }else if(eventType == 'mint'){
                        console.log('Mint de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString())
                        mint(asset)
                    }else if(eventType == 'airdrop'){
                        console.log('Airdrop de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString())
                    }else if(eventType == 'send'){
                        console.log('Envoi de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString())
                    }else {
                        console.log('unknown event type')
                    }
                }
            }    
            if(nandList.length > 100){
                console.log('Resultat erroné trop d\'asset ont changé')
            }
            oldWalletAsset = walletAsset
            //fs.writeFileSync('./oldWallet.json', JSON.stringify(oldWalletAsset));
        }
        //console.log('Analyse terminée on recommence')
        //await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60));
    }

}

export async function getContract(collection: string) {
    const openseaUrl = 'https://api.opensea.io/api/v1/asset_contract/' + collection
    axios.get(openseaUrl, {
        headers: {
            'X-API-KEY': process.env.OPENSEA_API_KEY
        },
    }).then(async (response) => {
        const data = await response.data
        return data
    });
}
config();