
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, CheckCircle2, Info } from "lucide-react";
import { addInvestment } from "@/services/investmentsService";
import { searchMutualFunds, getStockPrice } from "@/services/marketDataService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface MFSearchResult {
  schemeCode: string;
  schemeName: string;
  nav: number;
  navDate: string;
  category?: string;
  fundHouse?: string;
}

export function AddInvestmentDialog({ onInvestmentAdded }: { onInvestmentAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        type: "Stock",
        invested: "",
        current: "",
        units: "",
        symbol: "",         // For stocks
        schemeCode: "",     // For mutual funds
        platform: "",
    });

    // MF search results
    const [mfSearchResults, setMfSearchResults] = useState<MFSearchResult[]>([]);
    const [showMfSearch, setShowMfSearch] = useState(false);
    const [selectedMf, setSelectedMf] = useState<MFSearchResult | null>(null);
    
    // Stock price
    const [stockPrice, setStockPrice] = useState<number | null>(null);
    const [stockPriceLoading, setStockPriceLoading] = useState(false);

    // Search mutual funds
    const handleMfSearch = async (query: string) => {
        if (query.length < 3) {
            setMfSearchResults([]);
            return;
        }
        
        setSearchLoading(true);
        try {
            const results = await searchMutualFunds(query);
            setMfSearchResults(results);
            setShowMfSearch(true);
        } catch (error) {
            console.error("MF search failed:", error);
        } finally {
            setSearchLoading(false);
        }
    };

    // Select a mutual fund from search
    const handleSelectMf = (mf: MFSearchResult) => {
        setSelectedMf(mf);
        setFormData({
            ...formData,
            name: mf.schemeName,
            schemeCode: mf.schemeCode,
        });
        setShowMfSearch(false);
        setMfSearchResults([]);
        
        // Auto-calculate current value if units provided
        if (formData.units) {
            const current = parseFloat(formData.units) * mf.nav;
            setFormData(prev => ({ ...prev, current: current.toFixed(2) }));
        }
    };

    // Fetch stock price when symbol changes
    const fetchStockPrice = async (symbol: string) => {
        if (!symbol) {
            setStockPrice(null);
            return;
        }
        
        setStockPriceLoading(true);
        try {
            const data = await getStockPrice(symbol);
            setStockPrice(data.price);
            
            // Auto-calculate current value if units provided
            if (formData.units) {
                const current = parseFloat(formData.units) * data.price;
                setFormData(prev => ({ ...prev, current: current.toFixed(2) }));
            }
        } catch (error) {
            setStockPrice(null);
            console.error("Failed to fetch stock price:", error);
        } finally {
            setStockPriceLoading(false);
        }
    };

    // Calculate current value when units or NAV/price changes
    useEffect(() => {
        if (formData.units) {
            const units = parseFloat(formData.units);
            if (formData.type === "Mutual Fund" && selectedMf) {
                const current = units * selectedMf.nav;
                setFormData(prev => ({ ...prev, current: current.toFixed(2) }));
            } else if (formData.type === "Stock" && stockPrice) {
                const current = units * stockPrice;
                setFormData(prev => ({ ...prev, current: current.toFixed(2) }));
            }
        }
    }, [formData.units, selectedMf, stockPrice]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const invested = Number(formData.invested);
            const current = Number(formData.current) || invested;
            const change = invested > 0 ? ((current - invested) / invested) * 100 : 0;

            await addInvestment({
                name: formData.name,
                type: formData.type,
                invested: invested,
                current: current,
                change: Number(change.toFixed(2)),
                units: formData.units ? parseFloat(formData.units) : undefined,
                symbol: formData.symbol || undefined,
                schemeCode: formData.schemeCode || undefined,
                platform: formData.platform || undefined,
                purchaseDate: new Date(),
            });

            toast.success("Investment added successfully!");
            setOpen(false);
            resetForm();
            onInvestmentAdded();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add investment");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            type: "Stock",
            invested: "",
            current: "",
            units: "",
            symbol: "",
            schemeCode: "",
            platform: "",
        });
        setSelectedMf(null);
        setStockPrice(null);
        setMfSearchResults([]);
    };

    const isMutualFund = formData.type === "Mutual Fund" || formData.type === "SIP" || formData.type === "ELSS";
    const isStock = formData.type === "Stock" || formData.type === "ETF";

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
        }}>
            <DialogTrigger asChild>
                <Button variant="warm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Investment
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Investment</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Investment Type */}
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(val) => {
                                setFormData({ ...formData, type: val, symbol: "", schemeCode: "", name: "" });
                                setSelectedMf(null);
                                setStockPrice(null);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Stock">Stock</SelectItem>
                                <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                                <SelectItem value="SIP">SIP</SelectItem>
                                <SelectItem value="ETF">ETF</SelectItem>
                                <SelectItem value="ELSS">ELSS (Tax Saver)</SelectItem>
                                <SelectItem value="Index Fund">Index Fund</SelectItem>
                                <SelectItem value="Fixed Deposit">Fixed Deposit</SelectItem>
                                <SelectItem value="PPF">PPF</SelectItem>
                                <SelectItem value="NPS">NPS</SelectItem>
                                <SelectItem value="Gold">Gold</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Mutual Fund Search */}
                    {isMutualFund && (
                        <div className="space-y-2">
                            <Label>Search Mutual Fund</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-10"
                                    placeholder="Search by fund name..."
                                    onChange={(e) => handleMfSearch(e.target.value)}
                                />
                                {searchLoading && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                                )}
                            </div>
                            
                            {/* Search Results */}
                            {showMfSearch && mfSearchResults.length > 0 && (
                                <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                                    {mfSearchResults.map((mf) => (
                                        <button
                                            key={mf.schemeCode}
                                            type="button"
                                            className="w-full text-left p-2 hover:bg-muted/50 transition-colors"
                                            onClick={() => handleSelectMf(mf)}
                                        >
                                            <p className="text-sm font-medium truncate">{mf.schemeName}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="text-xs">NAV: ₹{mf.nav}</Badge>
                                                {mf.category && <span className="text-xs text-muted-foreground">{mf.category}</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            {/* Selected Fund */}
                            {selectedMf && (
                                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-success" />
                                        <span className="text-sm font-medium">Selected Fund</span>
                                    </div>
                                    <p className="text-sm mt-1 truncate">{selectedMf.schemeName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline">NAV: ₹{selectedMf.nav}</Badge>
                                        <span className="text-xs text-muted-foreground">as of {selectedMf.navDate}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stock Symbol */}
                    {isStock && (
                        <div className="space-y-2">
                            <Label htmlFor="symbol">Stock Symbol (NSE)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="symbol"
                                    placeholder="e.g., RELIANCE, TCS, INFY"
                                    value={formData.symbol}
                                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                                />
                                <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={() => fetchStockPrice(formData.symbol)}
                                    disabled={!formData.symbol || stockPriceLoading}
                                >
                                    {stockPriceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
                                </Button>
                            </div>
                            {stockPrice && (
                                <div className="flex items-center gap-2 text-sm text-success">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Current Price: ₹{stockPrice.toLocaleString()}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Enter NSE symbol without .NS suffix
                            </p>
                        </div>
                    )}

                    {/* Investment Name (for non-MF or manual) */}
                    {!selectedMf && (
                        <div className="space-y-2">
                            <Label htmlFor="name">Investment Name</Label>
                            <Input
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={isMutualFund ? "Or enter manually..." : "e.g., Reliance Industries"}
                            />
                        </div>
                    )}

                    {/* Platform */}
                    <div className="space-y-2">
                        <Label htmlFor="platform">Platform (Optional)</Label>
                        <Select
                            value={formData.platform}
                            onValueChange={(val) => setFormData({ ...formData, platform: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Groww">Groww</SelectItem>
                                <SelectItem value="Zerodha">Zerodha</SelectItem>
                                <SelectItem value="Upstox">Upstox</SelectItem>
                                <SelectItem value="Kuvera">Kuvera</SelectItem>
                                <SelectItem value="Angel One">Angel One</SelectItem>
                                <SelectItem value="5paisa">5paisa</SelectItem>
                                <SelectItem value="Paytm Money">Paytm Money</SelectItem>
                                <SelectItem value="ET Money">ET Money</SelectItem>
                                <SelectItem value="HDFC Securities">HDFC Securities</SelectItem>
                                <SelectItem value="ICICI Direct">ICICI Direct</SelectItem>
                                <SelectItem value="SBI">SBI</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Units */}
                    {(isMutualFund || isStock) && (
                        <div className="space-y-2">
                            <Label htmlFor="units">Units / Quantity</Label>
                            <Input
                                id="units"
                                type="number"
                                step="0.001"
                                value={formData.units}
                                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                                placeholder="e.g., 100.5"
                            />
                            <p className="text-xs text-muted-foreground">
                                Current value will be auto-calculated from live prices
                            </p>
                        </div>
                    )}

                    {/* Invested & Current Value */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="invested">Invested Amount (₹)</Label>
                            <Input
                                id="invested"
                                type="number"
                                required
                                value={formData.invested}
                                onChange={(e) => setFormData({ ...formData, invested: e.target.value })}
                                placeholder="50000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="current">
                                Current Value (₹) 
                                {(selectedMf || stockPrice) && (
                                    <span className="text-xs text-success ml-1">(Auto)</span>
                                )}
                            </Label>
                            <Input
                                id="current"
                                type="number"
                                value={formData.current}
                                onChange={(e) => setFormData({ ...formData, current: e.target.value })}
                                placeholder="52000"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading || !formData.name}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            "Add Investment"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
