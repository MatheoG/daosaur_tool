import axios from 'axios';
import { config } from 'dotenv';
import { asset } from './interface';
import { sell, buy, mint } from '.';
import fs from 'fs';

//recuperation des assets pour chaque adresse
export async function getWalletsAssets(walletList: string[]) {
    let adressAssets: any = {}
    let i = 0
    for (const address of walletList) {
        let assets: asset[] = []
        let cursor = ''
        i++
        do {
            const openseaUrl = 'https://api.opensea.io/api/v1/assets'
            try{
                axios.get(openseaUrl, {
                    headers: {
                        'X-API-KEY': process.env.OPENSEA_API_KEY
                    },
                    params: {
                        owner: address,
                        limit: 50,
                        cursor: cursor,
                    }
                })
                .then(async (response) => {
                    const data = await response?.data
                    //console.log('Nombre d\'asset pour ' + address + ': ' + data.assets.length)
                    assets.push(...data.assets)
                    cursor = data?.next
                })
                .catch(async (error) => {
                    console.log("Erreur lors de la requete de récupération des assets")
                })
            }catch(e){
                console.log("Erreur lors de la requete de récupération des assets")
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        } while (cursor)
        console.log('Adresse: ' + i + '/' + walletList.length + ' - Nombre d\'asset pour ' + address + ': ' + assets.length)
        adressAssets[address] = assets
    }
    return adressAssets
}

export async function trackWalletsAssets(walletList: string[]) {
    console.log('Tracking...')
    const oldWalletFile = fs.readFileSync('./oldWallet.json', 'utf8')
    let oldWalletAsset = oldWalletFile.length>0 ? JSON.parse(oldWalletFile) : await getWalletsAssets(walletList)
    while (true) {
        console.log('Checking...')
        const walletAsset = await getWalletsAssets(walletList)
        walletList.forEach((address) => async () => {
            console.log('Nombre d\'asset pour ' + address + ': ' + walletAsset[address].length)
            let nandList = oldWalletAsset[address]
                .filter((item: asset) => !walletAsset[address].some((z: asset) => z.id === item.id))
                .concat(walletAsset[address].filter((item: asset) => !oldWalletAsset[address].some((z: asset) => z.id === item.id)));
            //console.log(nandList);
            if (nandList.length > 0) {
                for (const asset of nandList) {
                    //pour chaque asset qui a changé on recupere les evenements
                    const openseaUrl = 'https://api.opensea.io/api/v1/events'
                    try{
                        axios.get(openseaUrl, {
                            headers: {
                                'X-API-KEY': process.env.OPENSEA_API_KEY
                            },
                            params: {
                                asset_contract_address: asset.asset_contract.address,
                                token_id: asset.token_id,
                                limit: 50,
                            },
                        })
                        .then(async (response) => {
                            const data = await response?.data
                            let event: any = ''
                            let y = 0
                            //on recupere le dernier evenement
                            while (event?.event_type != 'successful' && event?.event_type != 'transfer') {
                                event = response?.data.asset_events[y]
                                y++;
                            }
                            //si c'est un achat ou une vente
                            if (event.event_type == 'successful') {
                                //si l'asset est dans l'ancienne liste c'est une vente
                                if (asset in oldWalletAsset[address]) {
                                    console.log('vente on adresse: ' + address + " " + asset.name + " " + asset.token_id)
                                    sell(asset)
                                }
                                //si l'asset est dans la nouvelle liste c'est un achat
                                else {

                                    console.log('achat on adresse: ' + address + " " + asset.name + " " + asset.token_id)
                                    buy(asset)
                                }
                                //si c'est un transfert
                            } else {
                                //si l'asset est dans l'ancienne liste c'est un envoi
                                if (asset in oldWalletAsset[address]) {
                                    console.log('envoi on adresse: ' + address + " " + asset.name + " " + asset.token_id)
                                    //si l'asset est dans la nouvelle liste c'est un asset reçu
                                } else {
                                    //si il provient d'une adresse vide c'est un mint
                                    if (event.from_account.address == '0x0000000000000000000000000000000000000000') {
                                        console.log('mint on adresse: ' + address + " " + asset.name + " " + asset.token_id)
                                        mint(asset)
                                        //sinon c'est un airdrop
                                    } else {
                                        console.log('airdrop on adresse: ' + address + " " + asset.name + " " + asset.token_id)
                                    }
                                }
                            }

                        })
                        .catch(async (error) => {
                            console.log("Erreur lors de la requete de récupération des events")
                        })
                    }catch(error){
                        console.log("Erreur lors de la requete de récupération des events")
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        });
        oldWalletAsset = walletAsset
        fs.writeFileSync('./oldWallet.json', JSON.stringify(oldWalletAsset))
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