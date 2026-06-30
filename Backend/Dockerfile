FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=5000

RUN apk add --no-cache fontconfig ttf-dejavu ttf-liberation

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p /usr/src/app/uploads/certificates /usr/src/app/uploads/generated /usr/src/app/uploads/qrcodes /usr/src/app/uploads/templates \
  && chown -R node:node /usr/src/app/uploads

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const http=require('http'); http.get('http://127.0.0.1:5000/health', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

CMD ["npm", "start"]
