export const APP_USERS = [
  { name: process.env.USER1_NAME || '', color: '#7c6af5' },
  { name: process.env.USER2_NAME || '', color: '#4f8ef7' },
].filter(u => u.name)
