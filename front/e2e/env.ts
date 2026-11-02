// Ports dédiés aux tests e2e : ils ne gênent pas les serveurs de dev (3000/3001).
export const FRONT_PORT = 3100
export const API_PORT = 3101
export const FRONT_URL = `http://localhost:${FRONT_PORT}`
export const API_URL = `http://localhost:${API_PORT}`
