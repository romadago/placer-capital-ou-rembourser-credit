import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- Helper Components ---
interface InputSliderProps {
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  decimals?: number;
}

const InputSlider: React.FC<InputSliderProps> = ({ label, unit, value, onChange, min, max, step, decimals = 0 }) => (
  <div>
    <label className="text-gray-300 text-sm font-medium mb-2 block">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-bold text-white">{value.toFixed(decimals)} {unit}</span>
      </div>
    </label>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

// --- Custom Tooltip for Chart ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataRembourser = payload.find((p: any) => p.dataKey === 'Rembourser');
    const dataPlacer = payload.find((p: any) => p.dataKey === 'Placer');

    if (!dataRembourser || !dataPlacer) return null;

    const diff = dataPlacer.value - dataRembourser.value;
    const isPlacerBetter = diff > 0;

    return (
      <div className="bg-slate-900 p-4 rounded-lg border border-slate-600 text-white shadow-lg">
        <p className="font-bold mb-2 text-slate-300">{label}</p>
        <p style={{ color: '#818cf8' }}>Rembourser: {dataRembourser.value.toLocaleString('fr-FR', {style:'currency', currency:'EUR', maximumFractionDigits: 0})}</p>
        <p style={{ color: '#00FFD2' }}>Placer: {dataPlacer.value.toLocaleString('fr-FR', {style:'currency', currency:'EUR', maximumFractionDigits: 0})}</p>
        <hr className="my-2 border-slate-600" />
        <p className={`font-bold ${isPlacerBetter ? 'text-green-400' : 'text-red-400'}`}>
          Différentiel: {isPlacerBetter ? '+' : ''}{diff.toLocaleString('fr-FR', {style:'currency', currency:'EUR', maximumFractionDigits: 0})}
        </p>
      </div>
    );
  }
  return null;
};


// --- Financial Calculation Functions ---
const calculateMonthlyPayment = (principal: number, annualRate: number, years: number): number => {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return principal / (years * 12);
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;
  const i_plus_1_pow_n = Math.pow(1 + monthlyRate, numberOfPayments);
  return (principal * (monthlyRate * i_plus_1_pow_n)) / (i_plus_1_pow_n - 1);
};

const calculateFutureValueAnnuity = (monthlyPayment: number, annualRate: number, years: number): number => {
  if (monthlyPayment <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;
  if (monthlyRate === 0) return monthlyPayment * numberOfPayments;
  return monthlyPayment * (Math.pow(1 + monthlyRate, numberOfPayments) - 1) / monthlyRate;
};

const calculateFutureValueLumpSum = (principal: number, annualRate: number, years: number): number => {
  if (principal <= 0 || years <= 0) return 0;
  return principal * Math.pow(1 + (annualRate / 100), years);
};


// --- Main App Component ---
const App: React.FC = () => {
  // --- State ---
  const [capital, setCapital] = useState<number>(100000);
  const [duree, setDuree] = useState<number>(15);
  const [tauxCredit, setTauxCredit] = useState<number>(2.5);
  
  const [results, setResults] = useState<any>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');

  // --- Calculation Engine ---
  useEffect(() => {
    // --- Scenario 1: Rembourser le crédit ---
    const mensualite = calculateMonthlyPayment(capital, tauxCredit, duree);
    const coutTotalCredit = mensualite * duree * 12;
    const interetsEconomises = Math.max(0, coutTotalCredit - capital);
    
    const patrimoineRemboursement4 = calculateFutureValueAnnuity(mensualite, 4, duree);
    const patrimoineRemboursement6 = calculateFutureValueAnnuity(mensualite, 6, duree);

    // --- Scenario 2: Placer le capital ---
    const patrimoinePlacement4 = calculateFutureValueLumpSum(capital, 4, duree);
    const patrimoinePlacement6 = calculateFutureValueLumpSum(capital, 6, duree);
    
    setResults({
        mensualite,
        interetsEconomises,
        patrimoineRemboursement4,
        patrimoineRemboursement6,
        patrimoinePlacement4,
        patrimoinePlacement6,
    });
    
    setChartData([
        { name: 'Scénario @ 4%', Rembourser: patrimoineRemboursement4, Placer: patrimoinePlacement4 },
        { name: 'Scénario @ 6%', Rembourser: patrimoineRemboursement6, Placer: patrimoinePlacement6 },
    ]);

  }, [capital, duree, tauxCredit]);
  
  // --- Email form handler ---
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        setEmailMessage('Veuillez saisir une adresse e-mail valide.');
        return;
    }
    setIsSending(true);
    setEmailMessage('');

    const simulationData = {
        objectifs: {
            capital: `${capital.toLocaleString('fr-FR')} €`,
            duree: `${duree} ans`,
            tauxCredit: `${tauxCredit.toFixed(2)}%`,
        },
        resultats: {
           ...results
        }
    };

    try {
        const response = await fetch('/.netlify/functions/send-simulation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, data: simulationData, theme: 'Rembourser vs Placer' }),
        });

        if (!response.ok) { throw new Error("Erreur lors de l'envoi."); }

        setEmailMessage(`Votre simulation a bien été envoyée à ${email}.`);
        setEmail('');

    } catch (error) {
        console.error('Failed to send simulation:', error);
        setEmailMessage("Une erreur est survenue. Veuillez réessayer.");
    } finally {
        setIsSending(false);
        setTimeout(() => setEmailMessage(''), 5000);
    }
  };


  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-4 sm:p-8 font-sans flex items-center justify-center min-h-screen">
      <div className="bg-slate-800/50 backdrop-blur-sm ring-1 ring-white/10 p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-6xl mx-auto">
        
        <div className="text-center mb-10">
            <img src="/generique-turquoise.svg" alt="Logo Aeternia Patrimoine" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">Rembourser son Crédit ou Placer son Argent ?</h1>
            <p className="text-slate-300 mt-2">Comparez les deux stratégies pour prendre la meilleure décision pour votre patrimoine.</p>
        </div>

        {/* --- Controls --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 bg-slate-700/50 p-6 rounded-lg ring-1 ring-white/10">
            <InputSlider label="Capital disponible (et/ou restant dû)" unit="€" value={capital} onChange={setCapital} min={10000} max={500000} step={5000} />
            <InputSlider label="Durée restante du crédit" unit="ans" value={duree} onChange={setDuree} min={5} max={30} step={1} />
            <InputSlider label="Taux du crédit" unit="%" value={tauxCredit} onChange={setTauxCredit} min={0.5} max={7} step={0.1} decimals={2} />
        </div>

        {/* --- Results Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Option 1 : <span className="text-[#818cf8]">Rembourser</span> le crédit</h3>
                <div className="bg-slate-800/50 p-4 rounded-lg text-center mb-4">
                    <p className="text-sm text-slate-400">Intérêts économisés</p>
                    <p className="text-2xl font-extrabold text-green-400">~ {results.interetsEconomises?.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
                </div>
                <p className="text-sm text-slate-300 text-center mb-4">En plaçant votre mensualité libérée de <span className="font-bold">{results.mensualite?.toFixed(0)} €</span>, votre patrimoine final serait de :</p>
                 <div className="space-y-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                        <p className="font-semibold text-slate-300">Avec un placement à 4% :</p>
                        <p className="text-lg font-bold text-white">{results.patrimoineRemboursement4?.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
                    </div>
                     <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                        <p className="font-semibold text-slate-300">Avec un placement à 6% :</p>
                        <p className="text-lg font-bold text-white">{results.patrimoineRemboursement6?.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
                    </div>
                </div>
            </div>

             <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Option 2 : <span className="text-[#00FFD2]">Placer</span> le capital</h3>
                <p className="text-sm text-slate-300 text-center mb-4">En continuant de payer votre crédit, la valeur finale de votre placement serait de :</p>
                <div className="space-y-3 mt-[92px]">
                    <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                        <p className="font-semibold text-slate-300">Avec un rendement de 4% :</p>
                        <p className="text-lg font-bold text-white">{results.patrimoinePlacement4?.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
                    </div>
                     <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                        <p className="font-semibold text-slate-300">Avec un rendement de 6% :</p>
                        <p className="text-lg font-bold text-white">{results.patrimoinePlacement6?.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Chart Section */}
        <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
            <h2 className="text-xl font-semibold text-white mb-4 text-center">Comparatif du Patrimoine Final</h2>
             <div className="w-full h-80">
                <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(71, 85, 105, 0.3)'}} />
                        <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                        <Bar dataKey="Rembourser" fill="#818cf8" name="Rembourser le Crédit" />
                        <Bar dataKey="Placer" fill="#00FFD2" name="Placer le Capital" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* --- CTAs Section --- */}
        <div className="mt-10 pt-8 border-t border-slate-600">
             <h3 className="text-lg font-semibold text-gray-100 mb-4 text-center">Passez à l'étape suivante</h3>
             <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 mb-4 max-w-lg mx-auto">
                <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Recevoir ce comparatif par e-mail"
                    className="flex-grow bg-slate-800 text-white placeholder-slate-400 border border-slate-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#00FFD2]"
                    required
                />
                <button type="submit" disabled={isSending} className="bg-slate-600 text-white font-bold py-3 px-5 rounded-lg hover:bg-slate-500 transition-colors duration-300 disabled:opacity-50">
                    {isSending ? 'Envoi...' : 'Recevoir'}
                </button>
            </form>
            {emailMessage && <p className="text-sm text-center text-emerald-400 mb-4 h-5">{emailMessage}</p>}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                <a href="https://www.aeterniapatrimoine.fr/solutions/" target="_blank" rel="noopener noreferrer" className="bg-[#00FFD2] text-slate-900 font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-white transition-colors duration-300 w-full sm:w-auto">
                    Découvrir nos solutions
                </a>
                <a href="https://www.aeterniapatrimoine.fr/contact/" target="_blank" rel="noopener noreferrer" className="bg-transparent border-2 border-[#00FFD2] text-[#00FFD2] font-bold py-3 px-8 rounded-lg hover:bg-[#00FFD2] hover:text-slate-900 transition-colors duration-300 w-full sm:w-auto">
                    Prendre rendez-vous
                </a>
            </div>
        </div>
        
        {/* --- Disclaimer Section --- */}
        <div className="text-center mt-10">
             <div className="text-xs text-slate-400 p-4 bg-slate-900/50 rounded-lg max-w-3xl mx-auto">
                <h3 className="font-semibold text-slate-300 mb-2">Avertissement</h3>
                <p>Ce simulateur fournit une estimation à titre indicatif et non contractuel. Il ne prend pas en compte la fiscalité des placements ni les pénalités de remboursement anticipé. Pour une analyse personnalisée, consultez un de nos conseillers.</p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;