export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  crm: string;
  image: string;
  rating: number;
  reviewCount: number;
  consultationPrice: number;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  bio: string;
  education: string[];
  services: string[];
  availableSlots: {
    date: string;
    times: string[];
  }[];
}

export const mockDoctors: Doctor[] = [
  {
    id: "dra-ana-silva",
    name: "Dra. Ana Silva",
    specialty: "Cardiologia",
    crm: "CRM/SP 123456",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
    rating: 4.9,
    reviewCount: 127,
    consultationPrice: 160,
    city: "São Paulo",
    state: "SP",
    neighborhood: "Jardins",
    address: "Av. Paulista, 1000 - Sala 501, Jardins, São Paulo - SP",
    bio: "Cardiologista com mais de 15 anos de experiência. Especialista em prevenção cardiovascular e tratamento de arritmias.",
    education: [
      "Medicina - USP (2005)",
      "Residência em Cardiologia - InCor (2008)",
      "Especialização em Arritmias - Hospital Sírio-Libanês (2010)"
    ],
    services: [
      "Consulta cardiológica",
      "Eletrocardiograma",
      "Teste ergométrico",
      "Holter 24h"
    ],
    availableSlots: [
      { date: "2025-12-04", times: ["08:00", "09:00", "10:00", "14:00", "15:00"] },
      { date: "2025-12-05", times: ["08:30", "09:30", "11:00", "14:30", "16:00"] },
      { date: "2025-12-06", times: ["09:00", "10:00", "11:00"] },
      { date: "2025-12-09", times: ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"] },
      { date: "2025-12-10", times: ["08:30", "09:30", "10:30", "14:00", "15:30"] }
    ]
  },
  {
    id: "dr-carlos-santos",
    name: "Dr. Carlos Santos",
    specialty: "Dermatologia",
    crm: "CRM/SP 234567",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
    rating: 4.8,
    reviewCount: 98,
    consultationPrice: 160,
    city: "São Paulo",
    state: "SP",
    neighborhood: "Moema",
    address: "Rua dos Três Irmãos, 500 - Sala 302, Moema, São Paulo - SP",
    bio: "Dermatologista especializado em dermatologia clínica e estética. Tratamento de acne, manchas e rejuvenescimento.",
    education: [
      "Medicina - UNIFESP (2008)",
      "Residência em Dermatologia - Hospital das Clínicas (2011)",
      "Fellow em Dermatologia Estética - Miami (2013)"
    ],
    services: [
      "Consulta dermatológica",
      "Tratamento de acne",
      "Procedimentos estéticos",
      "Dermatoscopia"
    ],
    availableSlots: [
      { date: "2025-12-04", times: ["09:00", "10:00", "11:00", "15:00"] },
      { date: "2025-12-05", times: ["08:00", "09:00", "14:00", "15:00", "16:00"] },
      { date: "2025-12-06", times: ["10:00", "11:00", "14:00"] }
    ]
  },
  {
    id: "dra-maria-costa",
    name: "Dra. Maria Costa",
    specialty: "Ginecologia",
    crm: "CRM/SP 345678",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face",
    rating: 4.9,
    reviewCount: 215,
    consultationPrice: 160,
    city: "São Paulo",
    state: "SP",
    neighborhood: "Pinheiros",
    address: "Rua dos Pinheiros, 800 - Sala 1205, Pinheiros, São Paulo - SP",
    bio: "Ginecologista e obstetra com foco em saúde da mulher. Especialista em gestação de alto risco e reprodução humana.",
    education: [
      "Medicina - UNICAMP (2006)",
      "Residência em Ginecologia e Obstetrícia - HC/UNICAMP (2009)",
      "Especialização em Reprodução Humana (2012)"
    ],
    services: [
      "Consulta ginecológica",
      "Pré-natal",
      "Ultrassonografia obstétrica",
      "Colposcopia"
    ],
    availableSlots: [
      { date: "2025-12-04", times: ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"] },
      { date: "2025-12-05", times: ["08:30", "09:30", "10:30", "14:30"] },
      { date: "2025-12-06", times: ["09:00", "10:00", "11:00", "14:00", "15:00"] }
    ]
  },
  {
    id: "dr-pedro-lima",
    name: "Dr. Pedro Lima",
    specialty: "Ortopedia",
    crm: "CRM/SP 456789",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face",
    rating: 4.7,
    reviewCount: 156,
    consultationPrice: 160,
    city: "São Paulo",
    state: "SP",
    neighborhood: "Vila Olímpia",
    address: "Rua Funchal, 300 - Sala 801, Vila Olímpia, São Paulo - SP",
    bio: "Ortopedista especializado em cirurgia do joelho e medicina esportiva. Atende atletas profissionais e amadores.",
    education: [
      "Medicina - Santa Casa SP (2007)",
      "Residência em Ortopedia - IOT/HC-FMUSP (2010)",
      "Fellow em Cirurgia do Joelho - Hospital Albert Einstein (2012)"
    ],
    services: [
      "Consulta ortopédica",
      "Tratamento de lesões esportivas",
      "Infiltrações",
      "Cirurgia artroscópica"
    ],
    availableSlots: [
      { date: "2025-12-04", times: ["08:00", "09:00", "14:00", "15:00"] },
      { date: "2025-12-05", times: ["09:00", "10:00", "11:00", "14:00"] },
      { date: "2025-12-09", times: ["08:00", "09:00", "10:00", "14:00", "15:00"] }
    ]
  },
  {
    id: "dra-julia-oliveira",
    name: "Dra. Julia Oliveira",
    specialty: "Pediatria",
    crm: "CRM/SP 567890",
    image: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&h=400&fit=crop&crop=face",
    rating: 5.0,
    reviewCount: 189,
    consultationPrice: 160,
    city: "São Paulo",
    state: "SP",
    neighborhood: "Itaim Bibi",
    address: "Av. Juscelino Kubitschek, 1500 - Sala 401, Itaim Bibi, São Paulo - SP",
    bio: "Pediatra com especialização em neonatologia. Atendimento humanizado e acolhedor para bebês e crianças.",
    education: [
      "Medicina - USP (2009)",
      "Residência em Pediatria - Instituto da Criança (2012)",
      "Especialização em Neonatologia (2014)"
    ],
    services: [
      "Consulta pediátrica",
      "Puericultura",
      "Acompanhamento do recém-nascido",
      "Vacinação"
    ],
    availableSlots: [
      { date: "2025-12-04", times: ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00"] },
      { date: "2025-12-05", times: ["08:30", "09:30", "10:30", "14:30", "15:30"] },
      { date: "2025-12-06", times: ["09:00", "10:00", "11:00"] }
    ]
  },
  {
    id: "dr-roberto-alves",
    name: "Dr. Roberto Alves",
    specialty: "Psiquiatria",
    crm: "CRM/SP 678901",
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=face",
    rating: 4.8,
    reviewCount: 142,
    consultationPrice: 160,
    city: "São Paulo",
    state: "SP",
    neighborhood: "Higienópolis",
    address: "Av. Angélica, 2000 - Sala 601, Higienópolis, São Paulo - SP",
    bio: "Psiquiatra com foco em transtornos de ansiedade e depressão. Abordagem integrativa e humanizada.",
    education: [
      "Medicina - FMUSP (2004)",
      "Residência em Psiquiatria - IPq-HC (2007)",
      "Mestrado em Neurociências - USP (2010)"
    ],
    services: [
      "Consulta psiquiátrica",
      "Tratamento de ansiedade",
      "Tratamento de depressão",
      "Acompanhamento medicamentoso"
    ],
    availableSlots: [
      { date: "2025-12-04", times: ["09:00", "10:00", "14:00", "15:00", "16:00"] },
      { date: "2025-12-05", times: ["08:00", "09:00", "10:00", "14:00"] },
      { date: "2025-12-06", times: ["10:00", "11:00", "14:00", "15:00"] }
    ]
  },
  {
    id: "dra-fernanda-reis",
    name: "Dra. Fernanda Reis",
    specialty: "Oftalmologia",
    crm: "CRM/RJ 789012",
    image: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&h=400&fit=crop&crop=face",
    rating: 4.9,
    reviewCount: 167,
    consultationPrice: 160,
    city: "Rio de Janeiro",
    state: "RJ",
    neighborhood: "Copacabana",
    address: "Av. Nossa Senhora de Copacabana, 500 - Sala 1001, Copacabana, Rio de Janeiro - RJ",
    bio: "Oftalmologista especializada em cirurgia refrativa e catarata. Tecnologia de ponta para cuidar da sua visão.",
    education: [
      "Medicina - UFRJ (2007)",
      "Residência em Oftalmologia - Hospital dos Servidores (2010)",
      "Fellow em Cirurgia Refrativa - Wills Eye Hospital, EUA (2012)"
    ],
    services: [
      "Consulta oftalmológica",
      "Cirurgia de catarata",
      "Cirurgia refrativa",
      "Exames especializados"
    ],
    availableSlots: [
      { date: "2025-12-04", times: ["08:30", "09:30", "10:30", "14:30", "15:30"] },
      { date: "2025-12-05", times: ["08:00", "09:00", "10:00", "14:00", "15:00"] },
      { date: "2025-12-06", times: ["09:00", "10:00", "11:00"] }
    ]
  },
  {
    id: "dr-lucas-mendes",
    name: "Dr. Lucas Mendes",
    specialty: "Neurologia",
    crm: "CRM/RJ 890123",
    image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face",
    rating: 4.7,
    reviewCount: 98,
    consultationPrice: 160,
    city: "Rio de Janeiro",
    state: "RJ",
    neighborhood: "Botafogo",
    address: "Rua Voluntários da Pátria, 300 - Sala 502, Botafogo, Rio de Janeiro - RJ",
    bio: "Neurologista com experiência em doenças neurodegenerativas e dor crônica. Tratamento individualizado.",
    education: [
      "Medicina - UERJ (2008)",
      "Residência em Neurologia - UFRJ (2011)",
      "Especialização em Dor - Hospital Israelita Albert Einstein (2013)"
    ],
    services: [
      "Consulta neurológica",
      "Tratamento de enxaqueca",
      "Eletroneuromiografia",
      "Bloqueio de nervos"
    ],
    availableSlots: [
      { date: "2025-12-04", times: ["08:00", "09:00", "10:00", "14:00"] },
      { date: "2025-12-05", times: ["09:00", "10:00", "11:00", "15:00", "16:00"] },
      { date: "2025-12-09", times: ["08:00", "09:00", "14:00", "15:00"] }
    ]
  }
];

export const getDoctorById = (id: string): Doctor | undefined => {
  return mockDoctors.find(doctor => doctor.id === id);
};

export const searchDoctors = (
  specialty?: string,
  city?: string,
  state?: string
): Doctor[] => {
  return mockDoctors.filter(doctor => {
    const matchesSpecialty = !specialty || doctor.specialty.toLowerCase().includes(specialty.toLowerCase());
    const matchesCity = !city || doctor.city.toLowerCase().includes(city.toLowerCase());
    const matchesState = !state || doctor.state.toLowerCase() === state.toLowerCase();
    return matchesSpecialty && matchesCity && matchesState;
  });
};
