alias Core.Repo
alias Core.Schema.{Account, User, Plan, Studio, Content, CDNNode}

IO.puts("Seeding FluxStream database...")

# --- Plans ---
plans = [
  %{
    name: "Flux Free",
    slug: "flux-free",
    description: "Ad-supported streaming. Access to standard catalog.",
    monthly_price_cents: 0,
    annual_price_cents: 0,
    max_streams: 1,
    max_profiles: 1,
    max_quality: :hd,
    offline_downloads: false,
    hdr_enabled: false,
    dolby_atmos: false,
    ads_supported: true,
    trial_days: 0,
    sort_order: 0,
    features: ["Access to 10,000+ titles", "SD & HD quality", "Ad-supported"]
  },
  %{
    name: "Flux Standard",
    slug: "flux-standard",
    description: "Ad-free HD streaming. 2 simultaneous streams.",
    monthly_price_cents: 999,
    annual_price_cents: 9990,
    max_streams: 2,
    max_profiles: 3,
    max_quality: :full_hd,
    offline_downloads: false,
    hdr_enabled: false,
    dolby_atmos: false,
    ads_supported: false,
    trial_days: 7,
    sort_order: 1,
    features: ["Ad-free", "Full HD 1080p", "2 screens at once", "3 profiles"]
  },
  %{
    name: "Flux Premium",
    slug: "flux-premium",
    description: "4K UHD, HDR, Dolby Atmos. Offline downloads. 4 streams.",
    monthly_price_cents: 1799,
    annual_price_cents: 17990,
    max_streams: 4,
    max_profiles: 5,
    max_quality: :uhd_4k,
    offline_downloads: true,
    hdr_enabled: true,
    dolby_atmos: true,
    ads_supported: false,
    family_sharing: true,
    trial_days: 14,
    sort_order: 2,
    features: ["4K UHD + HDR", "Dolby Atmos", "4 screens at once", "5 profiles", "Offline downloads", "Family sharing"]
  },
  %{
    name: "Flux Enterprise",
    slug: "flux-enterprise",
    description: "White-label OTT deployment for businesses. Custom branding, dedicated CDN.",
    monthly_price_cents: 49900,
    annual_price_cents: 499000,
    max_streams: 999,
    max_profiles: 999,
    max_quality: :uhd_4k,
    offline_downloads: true,
    hdr_enabled: true,
    dolby_atmos: true,
    ads_supported: false,
    family_sharing: true,
    trial_days: 30,
    sort_order: 3,
    public: false,
    features: [
      "White-label branding", "Custom domain", "Dedicated CDN nodes",
      "SLA 99.99%", "Priority support", "Analytics dashboard",
      "SSO/OIDC integration", "Unlimited streams"
    ]
  }
]

Enum.each(plans, fn attrs ->
  Repo.insert!(Plan.changeset(%Plan{}, attrs), on_conflict: :nothing)
end)

IO.puts("  ✓ Plans seeded (#{length(plans)})")

# --- CDN Nodes ---
cdn_nodes = [
  %{name: "US East (N. Virginia)", region: "us-east-1", country: "US", city: "Ashburn", provider: 0, status: 1, pop_code: "IAD", capacity_gbps: 100.0},
  %{name: "US West (Oregon)", region: "us-west-2", country: "US", city: "Portland", provider: 0, status: 1, pop_code: "PDX", capacity_gbps: 80.0},
  %{name: "EU West (Ireland)", region: "eu-west-1", country: "IE", city: "Dublin", provider: 0, status: 1, pop_code: "DUB", capacity_gbps: 60.0},
  %{name: "EU Central (Frankfurt)", region: "eu-central-1", country: "DE", city: "Frankfurt", provider: 0, status: 1, pop_code: "FRA", capacity_gbps: 60.0},
  %{name: "Asia Pacific (Singapore)", region: "ap-southeast-1", country: "SG", city: "Singapore", provider: 0, status: 1, pop_code: "SIN", capacity_gbps: 50.0},
  %{name: "Asia Pacific (Mumbai)", region: "ap-south-1", country: "IN", city: "Mumbai", provider: 0, status: 1, pop_code: "BOM", capacity_gbps: 40.0},
  %{name: "Asia Pacific (Tokyo)", region: "ap-northeast-1", country: "JP", city: "Tokyo", provider: 0, status: 1, pop_code: "NRT", capacity_gbps: 50.0},
  %{name: "South America (São Paulo)", region: "sa-east-1", country: "BR", city: "São Paulo", provider: 0, status: 1, pop_code: "GRU", capacity_gbps: 30.0}
]

Enum.each(cdn_nodes, fn attrs ->
  Repo.insert!(CDNNode.changeset(%CDNNode{}, attrs), on_conflict: :nothing)
end)

IO.puts("  ✓ CDN nodes seeded (#{length(cdn_nodes)})")

# --- Demo Account & Admin User ---
account =
  case Repo.get_by(Account, slug: "fluxstream-demo") do
    nil ->
      Repo.insert!(Account.changeset(%Account{}, %{
        name: "FluxStream Demo",
        slug: "fluxstream-demo",
        tier: 2,
        billing_email: "admin@fluxstream.io"
      }))
    existing -> existing
  end

admin =
  case Repo.get_by(Core.Schema.User, email: "admin@fluxstream.io") do
    nil ->
      Repo.insert!(User.changeset(%User{}, %{
        name: "FluxStream Admin",
        email: "admin@fluxstream.io",
        password: "FluxAdmin2024!",
        role: 3,
        account_id: account.id
      }))
    existing -> existing
  end

IO.puts("  ✓ Demo account & admin user seeded")

# --- Demo Studio ---
studio =
  case Repo.get_by(Studio, slug: "fluxstream-originals") do
    nil ->
      Repo.insert!(Studio.changeset(%Studio{}, %{
        name: "FluxStream Originals",
        slug: "fluxstream-originals",
        description: "Official FluxStream original productions.",
        status: 1,
        verified: true,
        revenue_share: 1.0,
        owner_id: admin.id,
        account_id: account.id
      }))
    existing -> existing
  end

IO.puts("  ✓ Demo studio seeded")

# --- Content Catalog (TMDB poster images via public CDN) ---
tmdb_img = fn path -> "https://image.tmdb.org/t/p/w500#{path}" end
tmdb_banner = fn path -> "https://image.tmdb.org/t/p/original#{path}" end

catalog = [
  %{title: "Inception", content_type: :movie, genres: ["Action", "Sci-Fi", "Thriller"],
    description: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    thumbnail_url: tmdb_img.("/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg"),
    banner_url: tmdb_banner.("/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg"),
    duration_seconds: 8880, release_year: 2010, avg_rating: 8.8, view_count: 95200, featured: true},

  %{title: "The Dark Knight", content_type: :movie, genres: ["Action", "Crime", "Drama"],
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    thumbnail_url: tmdb_img.("/qJ2tW6WMUDux911r6m7haRef0WH.jpg"),
    banner_url: tmdb_banner.("/hqkIcbrOHL86UncnHIsHVcVmzue.jpg"),
    duration_seconds: 9120, release_year: 2008, avg_rating: 9.0, view_count: 112000, featured: true},

  %{title: "Interstellar", content_type: :movie, genres: ["Sci-Fi", "Drama", "Adventure"],
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    thumbnail_url: tmdb_img.("/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"),
    banner_url: tmdb_banner.("/xJHokMbljvjADYdit5fK5VQsXEG.jpg"),
    duration_seconds: 10140, release_year: 2014, avg_rating: 8.6, view_count: 89000, featured: true},

  %{title: "The Matrix", content_type: :movie, genres: ["Action", "Sci-Fi"],
    description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    thumbnail_url: tmdb_img.("/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"),
    banner_url: tmdb_banner.("/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg"),
    duration_seconds: 8160, release_year: 1999, avg_rating: 8.7, view_count: 78000, featured: true},

  %{title: "Parasite", content_type: :movie, genres: ["Thriller", "Drama", "Crime"],
    description: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    thumbnail_url: tmdb_img.("/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"),
    banner_url: tmdb_banner.("/ApiBzeaa95TNYLSKkZnA4eFJnHt.jpg"),
    duration_seconds: 8220, release_year: 2019, avg_rating: 8.5, view_count: 63000, featured: true},

  %{title: "Dune: Part One", content_type: :movie, genres: ["Sci-Fi", "Adventure", "Drama"],
    description: "A noble family becomes embroiled in a war for control over the galaxy's most valuable asset while its heir becomes troubled by visions of a dark future.",
    thumbnail_url: tmdb_img.("/d5NXSklXo0qyIYkgV94XAgMIckC.jpg"),
    banner_url: tmdb_banner.("/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg"),
    duration_seconds: 9360, release_year: 2021, avg_rating: 8.0, view_count: 71000, featured: true},

  %{title: "Avengers: Endgame", content_type: :movie, genres: ["Action", "Sci-Fi", "Adventure"],
    description: "After the devastating events of Infinity War, the Avengers assemble once more in order to reverse Thanos' actions and restore balance to the universe.",
    thumbnail_url: tmdb_img.("/or06FN3Dka5tukK1e9sl16pB3iy.jpg"),
    banner_url: tmdb_banner.("/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg"),
    duration_seconds: 10920, release_year: 2019, avg_rating: 8.4, view_count: 145000},

  %{title: "Oppenheimer", content_type: :movie, genres: ["Drama", "Thriller"],
    description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    thumbnail_url: tmdb_img.("/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"),
    banner_url: tmdb_banner.("/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg"),
    duration_seconds: 10800, release_year: 2023, avg_rating: 8.3, view_count: 84000},

  %{title: "The Shawshank Redemption", content_type: :movie, genres: ["Drama", "Crime"],
    description: "Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.",
    thumbnail_url: tmdb_img.("/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg"),
    banner_url: tmdb_banner.("/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg"),
    duration_seconds: 8520, release_year: 1994, avg_rating: 9.3, view_count: 102000},

  %{title: "Pulp Fiction", content_type: :movie, genres: ["Crime", "Drama", "Thriller"],
    description: "The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.",
    thumbnail_url: tmdb_img.("/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg"),
    banner_url: tmdb_banner.("/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg"),
    duration_seconds: 9360, release_year: 1994, avg_rating: 8.9, view_count: 91000},

  %{title: "Joker", content_type: :movie, genres: ["Crime", "Drama", "Thriller"],
    description: "A mentally troubled comedian embarks on a downward spiral of revolution and bloody crime in Gotham City.",
    thumbnail_url: tmdb_img.("/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg"),
    banner_url: tmdb_banner.("/n6bUvigpRFqSwmPp1m2YADgJpyN.jpg"),
    duration_seconds: 7440, release_year: 2019, avg_rating: 8.4, view_count: 97000},

  %{title: "Gladiator", content_type: :movie, genres: ["Action", "Drama", "Adventure"],
    description: "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.",
    thumbnail_url: tmdb_img.("/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg"),
    banner_url: tmdb_banner.("/6WBIzCgmDCYrqh64yDREGeDk9d3.jpg"),
    duration_seconds: 9360, release_year: 2000, avg_rating: 8.5, view_count: 68000},

  %{title: "The Lion King", content_type: :movie, genres: ["Animation", "Drama", "Adventure"],
    description: "Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.",
    thumbnail_url: tmdb_img.("/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg"),
    banner_url: tmdb_banner.("/wXsQvli6tWqja51pYxXNG1LFIGV.jpg"),
    duration_seconds: 5280, release_year: 1994, avg_rating: 8.5, view_count: 55000},

  %{title: "Spirited Away", content_type: :movie, genres: ["Animation", "Adventure", "Fantasy"],
    description: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.",
    thumbnail_url: tmdb_img.("/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"),
    banner_url: tmdb_banner.("/bSXfU4dwZyBA1vMmXvejdRXBvuF.jpg"),
    duration_seconds: 7440, release_year: 2001, avg_rating: 8.6, view_count: 49000},

  %{title: "Alien: Romulus", content_type: :movie, genres: ["Sci-Fi", "Horror", "Thriller"],
    description: "A group of young people on a distant world encounter the most terrifying life form in the universe.",
    thumbnail_url: tmdb_img.("/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg"),
    banner_url: tmdb_banner.("/9SSEUrSqhljBMzRe4aBTh17rUaC.jpg"),
    duration_seconds: 6780, release_year: 2024, avg_rating: 7.2, view_count: 34000},

  %{title: "Breaking Bad", content_type: :series, genres: ["Crime", "Drama", "Thriller"],
    description: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine to secure his family's future.",
    thumbnail_url: tmdb_img.("/ggFHVNu6YYI5L9pCfOacjizRGt.jpg"),
    banner_url: tmdb_banner.("/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg"),
    duration_seconds: 2940, release_year: 2008, avg_rating: 9.5, view_count: 134000, season_count: 5, episode_count: 62},

  %{title: "Game of Thrones", content_type: :series, genres: ["Drama", "Fantasy", "Action"],
    description: "Nine noble families fight for control over the mythical lands of Westeros, while an ancient enemy returns after being dormant for thousands of years.",
    thumbnail_url: tmdb_img.("/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg"),
    banner_url: tmdb_banner.("/suopoADq0k8YZr4dQXcU6pToj6s.jpg"),
    duration_seconds: 3600, release_year: 2011, avg_rating: 9.3, view_count: 188000, season_count: 8, episode_count: 73},

  %{title: "Stranger Things", content_type: :series, genres: ["Sci-Fi", "Horror", "Drama"],
    description: "When a young boy disappears, his mother, a police chief, and his friends must confront terrifying supernatural forces in order to get him back.",
    thumbnail_url: tmdb_img.("/49WJfeN0moxb9IPfGn8AIqMGskD.jpg"),
    banner_url: tmdb_banner.("/56v2KjBlU4XaOv9rVYEQypROD7P.jpg"),
    duration_seconds: 3300, release_year: 2016, avg_rating: 8.7, view_count: 155000, season_count: 4, episode_count: 34},

  %{title: "The Witcher", content_type: :series, genres: ["Action", "Fantasy", "Adventure"],
    description: "Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.",
    thumbnail_url: tmdb_img.("/cZ0d3rtvXPVo2iU7hAYK4Oq4Mca.jpg"),
    banner_url: tmdb_banner.("/lHu1wtNaczFPGFDTrjCSzeLPTKN.jpg"),
    duration_seconds: 3600, release_year: 2019, avg_rating: 8.2, view_count: 98000, season_count: 3, episode_count: 24},

  %{title: "Squid Game", content_type: :series, genres: ["Thriller", "Drama", "Action"],
    description: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games. Inside, a tempting prize awaits with deadly high stakes.",
    thumbnail_url: tmdb_img.("/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg"),
    banner_url: tmdb_banner.("/qw3J9cNeLioOLoR68WX7z79aCdK.jpg"),
    duration_seconds: 3240, release_year: 2021, avg_rating: 8.0, view_count: 212000, season_count: 2, episode_count: 18},

  %{title: "Wednesday", content_type: :series, genres: ["Comedy", "Horror", "Mystery"],
    description: "Follows Wednesday Addams' years as a student at Nevermore Academy, where she attempts to master her emerging psychic ability.",
    thumbnail_url: tmdb_img.("/9PFonBhy4cQy7Jz20NpMygczOkv.jpg"),
    banner_url: tmdb_banner.("/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg"),
    duration_seconds: 3000, release_year: 2022, avg_rating: 8.1, view_count: 143000, season_count: 2, episode_count: 16},

  %{title: "The Crown", content_type: :series, genres: ["Drama", "Romance"],
    description: "This drama follows the political rivalries and romance of Queen Elizabeth II's reign and the events that shaped the second half of the 20th century.",
    thumbnail_url: tmdb_img.("/6BBZ8KvMepakDDjf4TXGb7gQ1r3.jpg"),
    banner_url: tmdb_banner.("/f5sGCUMNLxRSHBRCXKTBL4M8mIn.jpg"),
    duration_seconds: 3600, release_year: 2016, avg_rating: 8.7, view_count: 67000, season_count: 6, episode_count: 60},

  %{title: "Planet Earth III", content_type: :documentary, genres: ["Documentary"],
    description: "Sir David Attenborough presents a visually stunning journey through Earth's most spectacular habitats.",
    thumbnail_url: tmdb_img.("/sgMuJLFsZkhQO1W7jEGnvXTHuJT.jpg"),
    banner_url: tmdb_banner.("/oGO0mBHRJ3S3FRLDKLkBiTEGFtc.jpg"),
    duration_seconds: 3600, release_year: 2023, avg_rating: 9.1, view_count: 44000},

  %{title: "The Social Dilemma", content_type: :documentary, genres: ["Documentary"],
    description: "Tech experts sound the alarm on the dangerous human impact of social networking, with a dramatic component to illustrate.",
    thumbnail_url: tmdb_img.("/pRnFDXWlMRdkR1SrFjH9E0cLdvT.jpg"),
    banner_url: tmdb_banner.("/3O7sTFzXFH6nsBhJxBZl2lZEu8P.jpg"),
    duration_seconds: 5400, release_year: 2020, avg_rating: 7.6, view_count: 31000},

  %{title: "Free Solo", content_type: :documentary, genres: ["Documentary", "Adventure"],
    description: "Follow Alex Honnold as he becomes the first person to free solo climb El Capitan's 900-metre vertical rock face.",
    thumbnail_url: tmdb_img.("/xf0sE7l6Mz7ORRZqrPk1MDqYgKZ.jpg"),
    banner_url: tmdb_banner.("/wS8oCzD74hsPfJhNDMgKRXzUxzx.jpg"),
    duration_seconds: 6000, release_year: 2018, avg_rating: 8.2, view_count: 28000},

  %{title: "Top Gun: Maverick", content_type: :movie, genres: ["Action", "Drama", "Adventure"],
    description: "After more than 30 years of service as one of the Navy's top aviators, Pete Mitchell is where he belongs, pushing the envelope as a courageous test pilot.",
    thumbnail_url: tmdb_img.("/62HCnUTziyWcpDaBO2i1DX17ljH.jpg"),
    banner_url: tmdb_banner.("/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg"),
    duration_seconds: 8040, release_year: 2022, avg_rating: 8.3, view_count: 119000},

  %{title: "Everything Everywhere All at Once", content_type: :movie, genres: ["Sci-Fi", "Comedy", "Drama"],
    description: "A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes.",
    thumbnail_url: tmdb_img.("/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg"),
    banner_url: tmdb_banner.("/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg"),
    duration_seconds: 7920, release_year: 2022, avg_rating: 8.0, view_count: 61000},

  %{title: "Spider-Man: Into the Spider-Verse", content_type: :movie, genres: ["Animation", "Action", "Sci-Fi"],
    description: "Teen Miles Morales becomes the Spider-Man of his universe and must join with five spider-powered individuals from other dimensions to stop a threat to all realities.",
    thumbnail_url: tmdb_img.("/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg"),
    banner_url: tmdb_banner.("/jOzrELAzFxtMx2I4uDGHOotdfsS.jpg"),
    duration_seconds: 7080, release_year: 2018, avg_rating: 8.4, view_count: 73000},

  %{title: "The Mandalorian", content_type: :series, genres: ["Action", "Sci-Fi", "Adventure"],
    description: "The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic.",
    thumbnail_url: tmdb_img.("/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg"),
    banner_url: tmdb_banner.("/9ijMGlJKqcslswWUzTEwScm82Gs.jpg"),
    duration_seconds: 2400, release_year: 2019, avg_rating: 8.7, view_count: 121000, season_count: 3, episode_count: 24},

  %{title: "Cobra Kai", content_type: :series, genres: ["Action", "Comedy", "Drama"],
    description: "Decades after their 1984 All Valley Karate Tournament bout, a chance meeting between old rivals LaRusso and Lawrence forces them to reckon with their choices.",
    thumbnail_url: tmdb_img.("/oUoGIwIGFGQ4LBMnkdHKLPzCBit.jpg"),
    banner_url: tmdb_banner.("/rqKmJXMFz1AzaEVZET4YZtBdcYe.jpg"),
    duration_seconds: 2700, release_year: 2018, avg_rating: 8.5, view_count: 88000, season_count: 6, episode_count: 60},
]

now = DateTime.utc_now()

inserted_count = Enum.reduce(catalog, 0, fn attrs, acc ->
  unless Repo.get_by(Content, title: attrs.title) do
    full_attrs = attrs
      |> Map.put(:studio_id, studio.id)
      |> Map.put(:status, :published)
      |> Map.put(:published_at, now)
      |> Map.put_new(:season_count, 0)
      |> Map.put_new(:episode_count, 0)
      |> Map.put_new(:featured, false)

    case Content.changeset(%Content{}, full_attrs) |> Repo.insert() do
      {:ok, _} -> acc + 1
      {:error, cs} ->
        IO.puts("  ⚠ Failed to insert '#{attrs.title}': #{inspect(cs.errors)}")
        acc
    end
  else
    acc
  end
end)

IO.puts("  ✓ Content catalog seeded (#{inserted_count} new titles)")
IO.puts("\nFluxStream seed complete.")
