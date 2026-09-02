import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Produce, ProduceStatus, QualityGrade } from '../../types';
import {
  getProduceByFarmer,
  updateProduce,
  deleteProduce,
  updateProduceStatus,
} from '../../services/produceService';
import { getPriceRecommendation } from '../../services/aiService';
import {
  Sprout,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Sparkles,
  Building,
  Tractor,
  TrendingUp,
  RefreshCw,
  Power,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatINR, formatDateTime } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const ProduceManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [produceList, setProduceList] = useState<Produce[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedProduce, setSelectedProduce] = useState<Produce | null>(null);
  const [editingProduce, setEditingProduce] = useState<Produce | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit form state
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editGrade, setEditGrade] = useState<QualityGrade>('Grade A');
  const [editHarvestDate, setEditHarvestDate] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [recalculatingAi, setRecalculatingAi] = useState<boolean>(false);
  const [aiPriceResult, setAiPriceResult] = useState<{ min: number; max: number; rec: number } | null>(null);

  const loadData = async () => {
    if (user) {
      setLoading(true);
      try {
        const data = await getProduceByFarmer(user.id);
        setProduceList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('vayora_produce_updated', loadData);
    return () => window.removeEventListener('vayora_produce_updated', loadData);
  }, [user]);

  const handleOpenEdit = (p: Produce) => {
    setEditingProduce(p);
    setEditPrice(p.expectedPrice);
    setEditQuantity(p.quantity);
    setEditGrade(p.qualityGrade);
    setEditHarvestDate(p.harvestDate);
    setEditLocation(p.location);
    if (p.aiMinimumPrice && p.aiMaximumPrice && p.aiRecommendedPrice) {
      setAiPriceResult({ min: p.aiMinimumPrice, max: p.aiMaximumPrice, rec: p.aiRecommendedPrice });
    } else {
      setAiPriceResult(null);
    }
  };

  const handleRegenerateAI = async () => {
    if (!editingProduce) return;
    setRecalculatingAi(true);
    try {
      const rec = await getPriceRecommendation({
        cropName: editingProduce.cropName,
        category: editingProduce.category,
        quantity: editQuantity,
        qualityGrade: editGrade,
        location: editLocation,
        harvestDate: editHarvestDate,
        farmerExpectedPrice: editPrice,
      });
      setAiPriceResult({ min: rec.minimumPrice, max: rec.maximumPrice, rec: rec.recommendedPrice });
      showToast('info', 'AI Recommendation Updated', `Indicative bounds recalculated: ₹${rec.minimumPrice} – ₹${rec.maximumPrice}/kg`);
    } catch (e) {
      showToast('error', 'AI Recalculation Failed', 'Could not fetch AI pricing.');
    } finally {
      setRecalculatingAi(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduce) return;

    await updateProduce(editingProduce.id, {
      expectedPrice: editPrice,
      quantity: editQuantity,
      availableQuantity: editQuantity,
      qualityGrade: editGrade,
      harvestDate: editHarvestDate,
      location: editLocation,
      aiMinimumPrice: aiPriceResult?.min || editingProduce.aiMinimumPrice,
      aiMaximumPrice: aiPriceResult?.max || editingProduce.aiMaximumPrice,
      aiRecommendedPrice: aiPriceResult?.rec || editingProduce.aiRecommendedPrice,
      status: editQuantity === 0 ? 'SOLD_OUT' : editingProduce.status,
    });

    showToast('success', 'Listing Updated', `${editingProduce.cropName} updated in Firestore.`);
    setEditingProduce(null);
    loadData();
  };

  const handleToggleDeactivate = async (p: Produce) => {
    const nextStatus: ProduceStatus = p.status === 'ACTIVE' || p.status === 'AVAILABLE' ? 'INACTIVE' : 'ACTIVE';
    await updateProduceStatus(p.id, nextStatus);
    showToast(
      'info',
      'Status Changed',
      `${p.cropName} status changed to ${nextStatus}.`
    );
    loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteProduce(id);
    setDeleteConfirmId(null);
    showToast('success', 'Produce Deleted', 'Listing removed from Cloud Firestore.');
    loadData();
  };

  const filtered = produceList.filter((p) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') return p.status === 'ACTIVE' || p.status === 'AVAILABLE';
    return p.status === filterStatus;
  });

  const isFPO = user?.role === 'FPO';

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Sprout className="w-6 h-6 text-brand-700" />
              My Produce Listings
            </h1>
            <Badge variant={isFPO ? 'teal' : 'green'} size="sm">
              {isFPO ? 'FPO Collective Hub' : 'Individual Producer'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Firestore listings for <strong>{user?.name}</strong>. Manage stock, adjust prices, review AI indicative guidance, or delist lots.
          </p>
        </div>

        <Link to="/farmer/produce/new">
          <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
            + List New Produce
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          {['ALL', 'ACTIVE', 'INACTIVE', 'SOLD_OUT'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-brand-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'All Lots' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong>{filtered.length}</strong> produce {filtered.length === 1 ? 'batch' : 'batches'}
        </span>
      </div>

      {/* Listings Table / Cards */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="p-4">Crop Details</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Quality</th>
                <th className="p-4">AI Indicative Price</th>
                <th className="p-4">Farmer Asking</th>
                <th className="p-4">Demand</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-5 h-5 text-brand-700 animate-spin" />
                      <span>Loading Produce from Cloud Firestore...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-3">
                      <p className="text-sm font-bold text-slate-700">No produce listings found.</p>
                      <p className="text-xs text-slate-500">
                        You have not published any harvest matching this filter yet.
                      </p>
                      <Link to="/farmer/produce/new">
                        <Button variant="primary" size="sm">
                          + Publish First Harvest
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isActive = p.status === 'ACTIVE' || p.status === 'AVAILABLE';
                  const minP = p.aiMinimumPrice || (p.aiRecommendedPrice ? Math.round(p.aiRecommendedPrice * 0.95) : null);
                  const maxP = p.aiMaximumPrice || (p.aiRecommendedPrice ? Math.round(p.aiRecommendedPrice * 1.05) : null);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Crop */}
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={p.images[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=100'}
                          alt={p.cropName}
                          className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">{p.cropName}</span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {p.location}
                          </span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-4 font-mono font-bold text-slate-800">
                        {p.availableQuantity} / {p.quantity} {p.unit}
                      </td>

                      {/* Quality Grade */}
                      <td className="p-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {p.qualityGrade}
                        </span>
                      </td>

                      {/* AI-Assisted Indicative Price */}
                      <td className="p-4 font-mono">
                        {minP && maxP ? (
                          <div>
                            <span className="font-bold text-emerald-800">
                              {formatINR(minP)} – {formatINR(maxP)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">per {p.unit}</span>
                          </div>
                        ) : p.aiRecommendedPrice ? (
                          <div>
                            <span className="font-bold text-emerald-800">{formatINR(p.aiRecommendedPrice)}</span>
                            <span className="text-[10px] text-slate-400 block">per {p.unit}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Pending AI</span>
                        )}
                      </td>

                      {/* Farmer Expected Price */}
                      <td className="p-4 font-mono font-extrabold text-slate-900 text-sm">
                        {formatINR(p.expectedPrice)}/{p.unit}
                      </td>

                      {/* Demand */}
                      <td className="p-4">
                        <Badge variant={p.demandLevel === 'HIGH' ? 'green' : 'amber'} size="sm">
                          {p.demandLevel || 'MEDIUM'}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                              : p.status === 'SOLD_OUT'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-amber-50 text-amber-900 border border-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {p.status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="p-4 font-mono text-slate-500 text-[11px]">
                        {p.createdAt ? p.createdAt.split('T')[0] : 'Today'}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedProduce(p)}
                          className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Produce Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Produce"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleDeactivate(p)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isActive
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isActive ? 'Deactivate Lot' : 'Activate Lot'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Produce Details Modal */}
      {selectedProduce && (
        <Modal
          isOpen={!!selectedProduce}
          onClose={() => setSelectedProduce(null)}
          title={selectedProduce.cropName}
          subtitle={`Lot ID #${selectedProduce.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <img
                src={selectedProduce.images[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'}
                alt={selectedProduce.cropName}
                className="w-full h-40 rounded-2xl object-cover border border-slate-200"
              />
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase">Farmer Asking Price</span>
                  <p className="text-xl font-bold font-mono text-slate-900">
                    {formatINR(selectedProduce.expectedPrice)} / {selectedProduce.unit}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase">AI-Assisted Indicative Range</span>
                  <p className="text-sm font-bold font-mono text-emerald-800">
                    {selectedProduce.aiMinimumPrice && selectedProduce.aiMaximumPrice
                      ? `${formatINR(selectedProduce.aiMinimumPrice)} – ${formatINR(selectedProduce.aiMaximumPrice)}`
                      : `${formatINR(selectedProduce.aiRecommendedPrice || 0)}`}{' '}
                    / {selectedProduce.unit}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase">Available Capacity</span>
                  <p className="font-mono font-bold text-slate-800">
                    {selectedProduce.availableQuantity} {selectedProduce.unit}
                  </p>
                </div>
              </div>
            </div>

            {selectedProduce.aiExplanation && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 leading-relaxed">
                <strong>AI Market Analysis:</strong> {selectedProduce.aiExplanation}
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setSelectedProduce(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Edit Listing Modal with AI Recalculation */}
      {editingProduce && (
        <Modal
          isOpen={!!editingProduce}
          onClose={() => setEditingProduce(null)}
          title={`Edit Produce: ${editingProduce.cropName}`}
          subtitle="Update lot quantities, target price, or re-run AI price recommendation"
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Target Price (₹/{editingProduce.unit}) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-300 font-mono font-bold text-sm outline-none focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Total Quantity ({editingProduce.unit}) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-300 font-mono font-bold text-sm outline-none focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Quality Grade</label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value as QualityGrade)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:bg-white"
                >
                  <option value="Grade A">Grade A (Standard Table)</option>
                  <option value="Grade A (Export)">Grade A (Export / Premium)</option>
                  <option value="Grade B">Grade B (Processing Grade)</option>
                  <option value="Grade C">Grade C (Local Consumption)</option>
                  <option value="Certified Organic">Certified Organic</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* AI Recalculation Widget */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-950 block">
                  AI-Assisted Indicative Price:
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800">
                  {aiPriceResult
                    ? `${formatINR(aiPriceResult.min)} – ${formatINR(aiPriceResult.max)} / ${editingProduce.unit}`
                    : 'Unchanged'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRegenerateAI}
                disabled={recalculatingAi}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recalculatingAi ? 'animate-spin' : ''}`} />
                <span>{recalculatingAi ? 'Recalculating...' : 'Regenerate AI'}</span>
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setEditingProduce(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                Save to Firestore
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Produce Listing?"
          subtitle="This action will delete the record from Cloud Firestore."
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>Are you sure you want to permanently delete this listing?</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
