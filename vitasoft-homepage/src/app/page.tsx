const products = [
  {
    name: "Mind",
    href: "https://mind.vitasoft.io",
    description: "Thần toán học — nền tảng học toán thông minh với AI.",
    status: "Đang phát triển",
  },
  {
    name: "Marketing Suite",
    href: "/marketing",
    description: "Bộ công cụ marketing tự động hoá bằng AI.",
    status: "Sắp ra mắt",
  },
];

export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <header style={{ marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Vitasoft</h1>
        <p style={{ fontSize: "1.15rem", color: "#555" }}>
          AI-powered software studio — biến ý tưởng thành sản phẩm.
        </p>
      </header>

      <section>
        <h2>Sản phẩm</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {products.map((product) => (
            <li
              key={product.name}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "1.25rem",
                marginBottom: "1rem",
              }}
            >
              <a href={product.href} style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                {product.name}
              </a>
              <p style={{ margin: "0.5rem 0 0.25rem" }}>{product.description}</p>
              <small style={{ color: "#888" }}>{product.status}</small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
