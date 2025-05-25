cd ~
ls
git clone -b redesign https://github.com/dcook604/violation.git
ls
cd vio
cd violation/
ls
ls -a
nano README.md 
nano .venv
cd .venv
ls
cd ..
ls
nano quick_reference.md 
ls
nano MEMORY_BANK.md 
nano mental_model.md 
exit
git status
git remote remove origin 2>/dev/null
git remote add origin https://github.com/dcook604/StrataTracker.git
git pull origin main --allow-unrelated-histories
dir
npm install
npx -y @smithery/cli@latest install @upstash/context7-mcp --client cursor --key 8efdb6e9-c2f9-40c8-980d-f4101b83cd29
npm run build
docker-compose up --build
sudo docker-compose up --build
sudo usermod -aG docker violation
su -
sudo docker-compose up --build
sudo usermod -aG violation
su -
sudo docker-compose up --build
su -
ls
sudo docker-compose up --build
sudo systemctl start docker
. "\home\violation\.cursor-server\cli\servers\Stable-02270c8441bdc4b2fdbc30e6f470a589ec78d600\server\out\vs\workbench\contrib\terminal\common\scripts\shellIntegration-bash.sh"
docker-compose up --build
sudo docker-compose up --build
docker-compose up --build
. "\home\violation\.cursor-server\cli\servers\Stable-02270c8441bdc4b2fdbc30e6f470a589ec78d600\server\out\vs\workbench\contrib\terminal\common\scripts\shellIntegration-bash.sh"
git add package.json Dockerfile
git commit -m "Fix Docker build: ensure Vite finds index.html and update check-conflicts script"
git push
ls
cd ~
ls
cd violation/
ls
cd ..
rm -rf violation/
cd ~
ls
Nano Dockerfile 
nano Dockerfile 
ls
cd app
cd client/
ls
nano index.html 
sudo docker-compose build --no-cache && sudo docker-compose up --build
cd ..
ls
sudo docker-compose build --no-cache && sudo docker-compose up --build
ls
sudo docker-compose build --no-cache > docker_build.log 2>&1 && sudo docker-compose up --build >> docker_build.log 2>&1
sudo docker-compose build --no-cache > docker_build.log 2>&1 && sudo docker-compose up >> docker_build.log 2>&1
docker ps
ls
nano docker_build.log 
sudo docker-compose down
docker system prune -a -f --volumes
sudo docker-compose up --build
sudo docker-compose down
docker system prune -a -f --volumes
sudo docker-compose build --no-cache > docker_build.log 2>&1 && sudo docker-compose up >> docker_build.log 2>&1
. "\home\violation\.cursor-server\cli\servers\Stable-02270c8441bdc4b2fdbc30e6f470a589ec78d600\server\out\vs\workbench\contrib\terminal\common\scripts\shellIntegration-bash.sh"
cd /home/violation && sudo docker ps
sudo docker logs bf165b48e728
sudo docker stop bf165b48e728
sudo docker-compose up --build
sudo docker --version && sudo docker-compose --version
sudo docker compose version
sudo docker compose down -v
sudo docker compose up --build
sudo docker compose down -v && sudo docker compose up --build
sudo docker compose up -d db && sleep 10 && sudo docker compose logs db
sudo docker compose down -v
sudo docker compose up --build
sudo visudo
su
git commit -m "Fix Docker build: ensure Vite finds index.html and update check-conflicts script"
git config --global user.name "Daniel"
git config --global user.email "you@example.com"
nano .gitignore
git push
nano .gitignore 
git lfs track
git ls-files | xargs -I{} du -h {} | sort -rh | head -2
git push
git commit -m "Remove large files from repo"
git addAA
git add .
git commit -m "Remove large files from repo"
git push
docker-compose up --build
su
sudo usermod -aG docker violation
WHOAMI
whoami
id
sudo visudo
sudo -i 
. "\home\violation\.cursor-server\cli\servers\Stable-02270c8441bdc4b2fdbc30e6f470a589ec78d600\server\out\vs\workbench\contrib\terminal\common\scripts\shellIntegration-bash.sh"
git rm --cached a888d02286694d2aa35e6cd0add934e92d1800b7
git push
docker-compose up --build --no-cache
docker-compose build --no-cache && docker-compose up --build
sudo docker-compose up --build
sudo docker-compose build --no-cache && sudo docker-compose up --build
. "\home\violation\.cursor-server\cli\servers\Stable-02270c8441bdc4b2fdbc30e6f470a589ec78d600\server\out\vs\workbench\contrib\terminal\common\scripts\shellIntegration-bash.sh"
sudo docker-compose build --no-cache > docker_build.log 2>&1 && sudo docker-compose up --build >> docker_build.log 2>&1
ls
cat docker_build.log 
git add .
git commit -m "Fix Docker build, runtime path errors, and update port config"
git push
sudo docker-compose logs backend
sudo docker-compose build --no-cache
sudo docker-compose up -d
sudo docker ps -a && sudo docker-compose logs backend
sudo docker-compose down && sudo docker-compose up --force-recreate -d && sleep 5 && sudo docker-compose logs backend
sudo docker-compose build --no-cache backend
sudo docker-compose up --force-recreate -d && sleep 5 && sudo docker-compose logs backend
sudo docker-compose down -v && sudo docker system prune -f && sudo docker volume prune -f
sudo docker-compose up --build
. "\home\violation\.cursor-server\cli\servers\Stable-02270c8441bdc4b2fdbc30e6f470a589ec78d600\server\out\vs\workbench\contrib\terminal\common\scripts\shellIntegration-bash.sh"
cd /home/violation && sudo docker-compose logs -f backend
sudo docker-compose build --no-cache backend
sudo docker-compose up --force-recreate -d && sleep 5 && sudo docker-compose logs backend
sudo docker build -t test-backend . && sudo docker run --rm -e NODE_ENV=production -e DATABASE_URL=postgres://spectrum4:spectrum4password@localhost:5432/spectrum4 -p 3001:3000 test-backend
sudo docker ps -a | grep test-backend
sudo docker run --rm -e NODE_ENV=production test-backend
sudo docker run --rm -e NODE_ENV=production -e DATABASE_URL=postgres://test:test@localhost:5432/test test-backend
sudo docker build --no-cache -t test-backend .
sudo docker run --rm -e NODE_ENV=production -e DATABASE_URL=postgres://test:test@localhost:5432/test test-backend
sudo docker build --no-cache -t test-backend .
sudo docker run --rm -e NODE_ENV=production -e DATABASE_URL=postgres://test:test@localhost:5432/test test-backend
. "\home\violation\.cursor-server\cli\servers\Stable-02270c8441bdc4b2fdbc30e6f470a589ec78d600\server\out\vs\workbench\contrib\terminal\common\scripts\shellIntegration-bash.sh"
cd /home/violation && sudo docker compose logs backend
sudo docker compose logs db | grep -E "(CREATE TABLE|INSERT|ERROR)" | tail -10
sudo docker compose up -d
sleep 5 && sudo docker compose logs backend | tail -10
git add . && git commit -m "Configure local PostgreSQL database and clean up Replit dependencies"
git add README.md docs/MIGRATION_GUIDE.md docs/TECHNICAL_OVERVIEW.md
git commit -m "Update documentation: README, technical overview, and migration guide - Updated README.md with new Docker setup instructions - Documented migration from Replit to local Docker environment - Added comprehensive troubleshooting and deployment guides - Created detailed migration guide with technical changes - Updated technical overview with current architecture - Added performance comparisons and future considerations"
git status
. "\home\violation\.cursor-server\cli\servers\Stable-02270c8441bdc4b2fdbc30e6f470a589ec78d600\server\out\vs\workbench\contrib\terminal\common\scripts\shellIntegration-bash.sh"
git status
pwd && ls -la
git status --porcelain | grep -v "\.cursor-server\|\.npm\|\.bash_history"
git log --oneline -3
ls -a
nano .env.example 
