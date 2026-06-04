# ============================================================
# Kron CMS — monorepo gelistirme imaji (api + web ortak kullanir)
# Tek imaj; servis komutlari docker-compose'da ayrismaktadir.
# ============================================================
FROM node:22-alpine

WORKDIR /app

# Once manifestler -> bagimlilik katmani cache'lenir
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
# (ileride) COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci

# Tum kaynak (.dockerignore ile node_modules/.next/.git haric)
COPY . .

EXPOSE 3000 4000

# Varsayilan: ikisini birden (compose servis bazinda override eder)
CMD ["npm", "run", "dev"]
