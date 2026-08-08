import { useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { SelectedTempleProvider, useSelectedTemple } from '../../contexts/SelectedTempleContext';
import { useLocation } from '../../contexts/LocationContext';
import RightRail from './RightRail';

interface TempleDetailDialogProps {
  temple: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px'
};

const MAP_STYLES = [
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "poi.place_of_worship",
    elementType: "all",
    stylers: [{ visibility: "on" }]
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  }
];

function DialogContent({ temple, onOpenChange }: { temple: any, onOpenChange: (open: boolean) => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setSelectedTemple } = useSelectedTemple();
  const { isLoaded } = useLocation();
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    setSelectedTemple({
      name: temple.name,
      placeId: temple.placeId,
      coordinates: temple.coordinates,
      vicinity: temple.address
    });
  }, [temple, setSelectedTemple]);

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
      <Dialog.Content className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl h-[90vh] md:h-[80vh] z-50 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden ${isDark ? 'bg-[#1a1b1e] text-white border border-white/10' : 'bg-white text-black border border-black/10'}`}>
        
        {/* Close Button */}
        <button 
          onClick={() => onOpenChange(false)}
          className={`absolute top-4 right-4 p-2 rounded-full z-10 transition-colors ${
            isDark ? 'bg-black/50 hover:bg-black text-white' : 'bg-white/80 hover:bg-white text-black shadow-sm'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Map */}
        <div className="w-full md:w-1/2 lg:w-3/5 h-1/2 md:h-full p-4 relative">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={temple.coordinates}
              zoom={15}
              options={{
                styles: MAP_STYLES,
                disableDefaultUI: true,
                zoomControl: true,
              }}
              onLoad={map => {
                mapRef.current = map;
              }}
            >
              <Marker position={temple.coordinates} title={temple.name} />
            </GoogleMap>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/5 rounded-2xl">
              Loading map...
            </div>
          )}
        </div>

        {/* Right Side: Info Tabs */}
        <div className={`w-full md:w-1/2 lg:w-2/5 h-1/2 md:h-full overflow-y-auto border-t md:border-t-0 md:border-l ${isDark ? 'border-white/10' : 'border-black/10'} p-4`}>
          <RightRail />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export default function TempleDetailDialog({ temple, open, onOpenChange }: TempleDetailDialogProps) {
  if (!temple) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <SelectedTempleProvider>
        <DialogContent temple={temple} onOpenChange={onOpenChange} />
      </SelectedTempleProvider>
    </Dialog.Root>
  );
}
