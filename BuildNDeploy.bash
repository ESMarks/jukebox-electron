npx electron-packager . JukeboxUI --platform=linux --arch=arm64 --out=dist --overwrite

tar -czvf dist/JukeboxUI.tar.gz -C dist JukeboxUI-linux-arm64

scp dist/JukeboxUI.tar.gz pi@jukeboxpi:/home/pi/Downloads 

ssh pi@jukeboxpi "cd Downloads && tar -xzvf JukeboxUI.tar.gz -C ../"
