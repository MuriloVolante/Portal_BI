/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Driver do SQL Server (exportação do banco de horas) roda como pacote
    // Node normal, sem passar pelo bundler.
    serverComponentsExternalPackages: ["mssql", "tedious"],
  },
};

export default nextConfig;
