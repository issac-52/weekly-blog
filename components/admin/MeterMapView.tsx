'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LocateFixed, RefreshCw } from 'lucide-react';
import {
  getMeterRecordsForMap,
  getUngeocodedRecords,
  type MeterRecord,
  type StatusFilter,
} from '@/app/admin/meter/_actions';
import MeterEditModal from './MeterEditModal';

declare global {
  interface Window { naver: any; }
}

function getStatus(r: MeterRecord): 'processed' | 'unprocessed' | 'closed' {
  if (r.note === '호폐') return 'closed';
  if (r.meter_number && r.reading && r.sealed && r.location && r.usage_type && r.floor) return 'processed';
  return 'unprocessed';
}

const STATUS_COLOR: Record<string, string> = {
  processed: '#34d399',
  unprocessed: '#52525b',
  closed: '#fbbf24',
};

function naverMaps() {
  return window.naver?.maps ?? null;
}

export default function MeterMapView({
  selectedBlock,
  status,
}: {
  selectedBlock: string | null;
  status: StatusFilter | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const userMarker = useRef<any>(null);

  const [records, setRecords] = useState<MeterRecord[]>([]);
  const [ungeocodedCount, setUngeocodedCount] = useState(0);
  const [editingRecord, setEditingRecord] = useState<MeterRecord | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState<{ current: number; total: number } | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Naver Maps SDK 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (naverMaps()) { setSdkReady(true); return; }

    // 콜백 등록 (클린업으로 지우지 않음 — strict mode 이중 실행 대응)
    (window as any).__naverMapReady = () => setSdkReady(true);

    if (!document.querySelector('script[data-naver-maps]')) {
      const script = document.createElement('script');
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}&callback=__naverMapReady`;
      script.setAttribute('data-naver-maps', '');
      document.head.appendChild(script);
    }

    // 콜백이 누락될 경우를 대비한 폴링 fallback
    const poll = setInterval(() => {
      if (naverMaps()) { setSdkReady(true); clearInterval(poll); }
    }, 150);
    return () => clearInterval(poll);
  }, []);

  // 현재 위치 취득 — 상태만 업데이트, SDK API 직접 호출 없음
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => { locateUser(); }, [locateUser]);

  // 레코드 로드
  const loadRecords = useCallback(async () => {
    setLoading(true);
    const [data, ungeocoded] = await Promise.all([
      getMeterRecordsForMap(selectedBlock ?? undefined, status ?? undefined),
      getUngeocodedRecords(selectedBlock ?? undefined),
    ]);
    setRecords(data);
    setUngeocodedCount(ungeocoded.length);
    setLoading(false);
  }, [selectedBlock, status]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // 지도 초기화 (SDK 준비 + div 마운트 시 1회)
  useEffect(() => {
    const nm = naverMaps();
    if (!sdkReady || !nm || !mapRef.current || mapInstance.current) return;
    const center = userPos
      ? new nm.LatLng(userPos.lat, userPos.lng)
      : new nm.LatLng(37.5665, 126.9780);
    mapInstance.current = new nm.Map(mapRef.current, {
      center,
      zoom: 17,
      mapTypeId: 'normal',
    });
  }, [sdkReady, userPos]);

  // 위치 변경 시 지도 중심 이동
  useEffect(() => {
    const nm = naverMaps();
    if (!nm || !mapInstance.current || !userPos) return;
    mapInstance.current.setCenter(new nm.LatLng(userPos.lat, userPos.lng));
  }, [userPos]);

  // 내 위치 마커
  useEffect(() => {
    const nm = naverMaps();
    if (!sdkReady || !nm || !mapInstance.current || !userPos) return;
    if (userMarker.current) userMarker.current.setMap(null);
    userMarker.current = new nm.Marker({
      position: new nm.LatLng(userPos.lat, userPos.lng),
      map: mapInstance.current,
      icon: {
        content: '<div style="width:18px;height:18px;background:#60a5fa;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px rgba(96,165,250,0.35);"></div>',
        anchor: new nm.Point(9, 9),
      },
      zIndex: 200,
    });
  }, [sdkReady, userPos]);

  // 레코드 마커 렌더링
  useEffect(() => {
    const nm = naverMaps();
    if (!sdkReady || !nm || !mapInstance.current) return;
    markers.current.forEach((m) => m.setMap(null));
    markers.current = [];

    records.forEach((r) => {
      if (!r.lat || !r.lng) return;
      const color = STATUS_COLOR[getStatus(r)];
      const marker = new nm.Marker({
        position: new nm.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        icon: {
          content: `<div style="width:11px;height:11px;background:${color};border-radius:50%;border:2px solid rgba(0,0,0,0.4);cursor:pointer;"></div>`,
          anchor: new nm.Point(5, 5),
        },
        zIndex: 100,
      });
      nm.Event.addListener(marker, 'click', () => setEditingRecord(r));
      markers.current.push(marker);
    });
  }, [sdkReady, records]);

  // 일괄 지오코딩
  async function handleGeocoding() {
    setGeocoding(true);
    const toProcess = await getUngeocodedRecords(selectedBlock ?? undefined);
    setGeocodeProgress({ current: 0, total: toProcess.length });
    for (let i = 0; i < toProcess.length; i++) {
      const r = toProcess[i];
      if (!r.address) { setGeocodeProgress({ current: i + 1, total: toProcess.length }); continue; }
      try {
        await fetch('/admin/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record_id: r.id, address: r.address }),
        });
      } catch {}
      setGeocodeProgress({ current: i + 1, total: toProcess.length });
    }
    await loadRecords();
    setGeocoding(false);
    setGeocodeProgress(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 상태 바 */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-zinc-500">
          좌표 있음 <span className="text-emerald-400 font-semibold">{records.length}</span>개
          {ungeocodedCount > 0 && (
            <> · 없음 <span className="text-zinc-400 font-semibold">{ungeocodedCount}</span>개</>
          )}
        </span>
        {ungeocodedCount > 0 && (
          <button
            onClick={handleGeocoding}
            disabled={geocoding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {geocoding ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                {geocodeProgress ? `${geocodeProgress.current} / ${geocodeProgress.total}` : '준비 중...'}
              </>
            ) : '좌표 업데이트'}
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1 text-zinc-500"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />처리됨</span>
          <span className="flex items-center gap-1 text-zinc-500"><span className="w-2.5 h-2.5 rounded-full bg-zinc-500 inline-block" />미처리</span>
          <span className="flex items-center gap-1 text-zinc-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />호폐</span>
        </div>
      </div>

      {/* 지도 */}
      <div className="relative rounded-xl overflow-hidden border border-zinc-800" style={{ height: '65dvh' }}>
        {(loading || !sdkReady) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-zinc-900/90">
            <RefreshCw size={20} className="animate-spin text-zinc-400" />
            {!sdkReady && <p className="text-xs text-zinc-500">지도 로딩 중...</p>}
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
        <button
          onClick={locateUser}
          disabled={locating}
          className="absolute bottom-4 right-4 z-10 p-2.5 bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-colors disabled:opacity-50"
          title="내 위치로 이동"
        >
          <LocateFixed size={16} className={locating ? 'animate-pulse' : ''} />
        </button>
      </div>

      {editingRecord && (
        <MeterEditModal
          record={editingRecord}
          onClose={async () => {
            setEditingRecord(null);
            await loadRecords();
          }}
        />
      )}
    </div>
  );
}
