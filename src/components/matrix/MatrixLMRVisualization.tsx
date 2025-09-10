import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface MatrixLayer {
  layer: number;
  positions: MatrixPosition[];
  filledPositions: number;
  totalPositions: number;
}

interface MatrixPosition {
  position: string;
  memberWallet?: string;
  username?: string;
  level?: number;
  isActive: boolean;
}

interface MatrixLMRVisualizationProps {
  layers: MatrixLayer[];
}

// Function to convert layer positions to L-M-R structure
const convertToLMRStructure = (layers: MatrixLayer[]) => {
  const lmrLayers: { [key: number]: { left: MatrixPosition[], middle: MatrixPosition[], right: MatrixPosition[] } } = {};
  
  layers.forEach(layer => {
    const positions = layer.positions;
    const lmrStructure: { left: MatrixPosition[], middle: MatrixPosition[], right: MatrixPosition[] } = { 
      left: [], 
      middle: [], 
      right: [] 
    };
    
    // For 3x3 matrix: positions are typically arranged in rows
    // We need to map to L-M-R columns instead
    positions.forEach((position, index) => {
      if (layer.layer === 1) {
        // Layer 1: 3 positions -> 1 per column
        if (index === 0) lmrStructure.left.push(position);
        else if (index === 1) lmrStructure.middle.push(position);
        else if (index === 2) lmrStructure.right.push(position);
      } else if (layer.layer === 2) {
        // Layer 2: 9 positions -> 3 per column
        if (index % 3 === 0) lmrStructure.left.push(position);
        else if (index % 3 === 1) lmrStructure.middle.push(position);
        else lmrStructure.right.push(position);
      } else {
        // Layer 3+: distribute evenly across columns
        if (index % 3 === 0) lmrStructure.left.push(position);
        else if (index % 3 === 1) lmrStructure.middle.push(position);
        else lmrStructure.right.push(position);
      }
    });
    
    lmrLayers[layer.layer] = lmrStructure;
  });
  
  return lmrLayers;
};

const MatrixLMRVisualization: React.FC<MatrixLMRVisualizationProps> = ({ layers }) => {
  const [currentLayer, setCurrentLayer] = useState(1);
  
  const lmrLayers = convertToLMRStructure(layers);
  const maxLayer = Math.max(...layers.map(l => l.layer), 19);
  const currentData = lmrLayers[currentLayer] || { left: [], middle: [], right: [] };
  
  const renderMemberCard = (member: MatrixPosition, columnType: string) => (
    <div
      key={member.position}
      className={`
        p-3 rounded-lg border-2 text-center transition-all
        ${member.memberWallet 
          ? `border-${columnType === 'left' ? 'green' : columnType === 'middle' ? 'blue' : 'purple'}-400 bg-${columnType === 'left' ? 'green' : columnType === 'middle' ? 'blue' : 'purple'}-400/10` 
          : 'border-gray-500 bg-gray-500/10'
        }
      `}
    >
      {member.memberWallet ? (
        <div className="space-y-1">
          <div className="w-8 h-8 bg-gradient-to-br from-honey to-yellow-600 rounded-full mx-auto flex items-center justify-center">
            <span className="text-xs font-bold text-black">
              {member.username?.charAt(0).toUpperCase() || member.memberWallet.slice(-2)}
            </span>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            {member.memberWallet.slice(-4)}
          </div>
          {member.level && (
            <Badge variant="outline" className="text-xs">
              L{member.level}
            </Badge>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="w-8 h-8 border-2 border-dashed border-muted-foreground/30 rounded-full mx-auto flex items-center justify-center">
            <span className="text-xs text-muted-foreground">?</span>
          </div>
          <div className="text-xs text-muted-foreground opacity-60">
            Available
          </div>
        </div>
      )}
    </div>
  );

  const renderEmptySlots = (count: number, columnType: string) => {
    return Array.from({ length: count }, (_, i) => (
      <div
        key={`empty-${i}`}
        className="p-3 rounded-lg border-2 border-dashed border-muted-foreground/20 text-center"
      >
        <div className="w-8 h-8 border-2 border-dashed border-muted-foreground/30 rounded-full mx-auto flex items-center justify-center">
          <span className="text-xs text-muted-foreground">?</span>
        </div>
        <div className="text-xs text-muted-foreground opacity-60 mt-1">
          Open
        </div>
      </div>
    ));
  };

  if (layers.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <div className="text-muted-foreground">No matrix data yet</div>
        <div className="text-xs text-muted-foreground">Start referring members to build your network</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Layer Navigation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentLayer(Math.max(1, currentLayer - 1))}
            disabled={currentLayer <= 1}
            className="border-honey/30 text-honey hover:bg-honey hover:text-black"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="text-center">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Layer {currentLayer} / {maxLayer}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              Max capacity: {Math.pow(3, currentLayer)} positions
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentLayer(Math.min(maxLayer, currentLayer + 1))}
            disabled={currentLayer >= maxLayer}
            className="border-honey/30 text-honey hover:bg-honey hover:text-black"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Layer Quick Navigation - Show first 19 layers */}
        <div className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: Math.min(19, maxLayer) }, (_, i) => {
            const layerNum = i + 1;
            const isActive = layerNum === currentLayer;
            const layerData = lmrLayers[layerNum];
            const memberCount = layerData ? 
              (layerData.left?.length || 0) + (layerData.middle?.length || 0) + (layerData.right?.length || 0) : 0;
            
            return (
              <Button
                key={layerNum}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentLayer(layerNum)}
                className={`h-8 w-10 text-xs ${
                  isActive 
                    ? 'bg-honey text-black' 
                    : memberCount > 0 
                      ? 'border-honey/30 text-honey hover:bg-honey/20' 
                      : 'border-muted text-muted-foreground'
                }`}
              >
                {layerNum}
                {memberCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* L-M-R Matrix Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Leg */}
        <div className="space-y-3">
          <div className="text-center">
            <Badge variant="outline" className="border-green-400 text-green-400">
              LEFT LEG ({currentData.left.length})
            </Badge>
          </div>
          <div className="space-y-2">
            {currentData.left.map((member) => renderMemberCard(member, 'left'))}
            {currentData.left.length === 0 && renderEmptySlots(1, 'left')}
          </div>
        </div>

        {/* Middle Leg */}
        <div className="space-y-3">
          <div className="text-center">
            <Badge variant="outline" className="border-blue-400 text-blue-400">
              MIDDLE LEG ({currentData.middle.length})
            </Badge>
          </div>
          <div className="space-y-2">
            {currentData.middle.map((member) => renderMemberCard(member, 'middle'))}
            {currentData.middle.length === 0 && renderEmptySlots(1, 'middle')}
          </div>
        </div>

        {/* Right Leg */}
        <div className="space-y-3">
          <div className="text-center">
            <Badge variant="outline" className="border-purple-400 text-purple-400">
              RIGHT LEG ({currentData.right.length})
            </Badge>
          </div>
          <div className="space-y-2">
            {currentData.right.map((member) => renderMemberCard(member, 'right'))}
            {currentData.right.length === 0 && renderEmptySlots(1, 'right')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixLMRVisualization;