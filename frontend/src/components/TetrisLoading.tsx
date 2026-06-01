import { useState, useEffect, useCallback, useRef } from 'react';

const TETRIS_PIECES = [
  { shape: [[1, 1, 1, 1]], color: 'bg-primary' },
  { shape: [[1, 1], [1, 1]], color: 'bg-primary' },
  { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-primary' },
  { shape: [[1, 0], [1, 0], [1, 1]], color: 'bg-primary' },
  { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-primary/70' },
  { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-primary/70' },
  { shape: [[0, 1], [0, 1], [1, 1]], color: 'bg-primary' },
];

interface Cell { filled: boolean; color: string; }
interface FallingPiece { shape: number[][]; color: string; x: number; y: number; }

interface TetrisLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  speed?: 'slow' | 'normal' | 'fast';
  showLoadingText?: boolean;
  loadingText?: string;
}

export default function TetrisLoading({
  size = 'sm',
  speed = 'fast',
  showLoadingText = true,
  loadingText = 'Loading...',
}: TetrisLoadingProps) {
  const sizeConfig = {
    sm: { cellSize: 'w-2 h-2', gridWidth: 8, gridHeight: 12, padding: 'p-0.5' },
    md: { cellSize: 'w-3 h-3', gridWidth: 10, gridHeight: 16, padding: 'p-1' },
    lg: { cellSize: 'w-3 h-3', gridWidth: 10, gridHeight: 16, padding: 'p-1' },
  };
  const speedConfig = { slow: 150, normal: 80, fast: 45 };

  const config = sizeConfig[size];
  const fallSpeed = speedConfig[speed];

  const [grid, setGrid] = useState<Cell[][]>(() =>
    Array(config.gridHeight).fill(null).map(() =>
      Array(config.gridWidth).fill(null).map(() => ({ filled: false, color: '' }))
    )
  );
  const [fallingPiece, setFallingPiece] = useState<FallingPiece | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const frameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  const rotateShape = useCallback((shape: number[][]): number[][] => {
    const rows = shape.length, cols = shape[0].length;
    const rotated: number[][] = Array(cols).fill(null).map(() => Array(rows).fill(0));
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        rotated[j][rows - 1 - i] = shape[i][j];
    return rotated;
  }, []);

  const createNewPiece = useCallback((): FallingPiece => {
    const pd = TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
    let shape = pd.shape;
    const rotations = Math.floor(Math.random() * 4);
    for (let i = 0; i < rotations; i++) shape = rotateShape(shape);
    const x = Math.floor(Math.random() * (config.gridWidth - shape[0].length + 1));
    return { shape, color: pd.color, x, y: -shape.length };
  }, [rotateShape, config.gridWidth]);

  const canPlace = useCallback((piece: FallingPiece, nx: number, ny: number): boolean => {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c]) {
          const gx = nx + c, gy = ny + r;
          if (gx < 0 || gx >= config.gridWidth || gy >= config.gridHeight) return false;
          if (gy >= 0 && grid[gy][gx].filled) return false;
        }
    return true;
  }, [grid, config.gridWidth, config.gridHeight]);

  const placePiece = useCallback((piece: FallingPiece) => {
    setGrid(prev => {
      const ng = prev.map(row => row.map(cell => ({ ...cell })));
      for (let r = 0; r < piece.shape.length; r++)
        for (let c = 0; c < piece.shape[r].length; c++)
          if (piece.shape[r][c]) {
            const gx = piece.x + c, gy = piece.y + r;
            if (gy >= 0 && gy < config.gridHeight && gx >= 0 && gx < config.gridWidth)
              ng[gy][gx] = { filled: true, color: piece.color };
          }
      return ng;
    });
  }, [config.gridHeight, config.gridWidth]);

  const clearFullLines = useCallback(() => {
    setGrid(prev => {
      const lines: number[] = [];
      prev.forEach((row, i) => { if (row.every(c => c.filled)) lines.push(i); });
      if (!lines.length) return prev;
      setIsClearing(true);
      setTimeout(() => {
        setGrid(cur => {
          const filtered = cur.filter((_, i) => !lines.includes(i));
          const empty = Array(lines.length).fill(null).map(() =>
            Array(config.gridWidth).fill(null).map(() => ({ filled: false, color: '' }))
          );
          setIsClearing(false);
          return [...empty, ...filtered];
        });
      }, 150);
      return prev;
    });
  }, [config.gridWidth]);

  const checkReset = useCallback(() => {
    const top = grid.slice(0, 3);
    if (top.some(row => row.filter(c => c.filled).length > config.gridWidth * 0.6)) {
      setIsClearing(true);
      setTimeout(() => {
        setGrid(Array(config.gridHeight).fill(null).map(() =>
          Array(config.gridWidth).fill(null).map(() => ({ filled: false, color: '' }))
        ));
        setFallingPiece(null);
        setIsClearing(false);
      }, 400);
      return true;
    }
    return false;
  }, [grid, config.gridWidth, config.gridHeight]);

  useEffect(() => {
    const loop = (ts: number) => {
      if (ts - lastUpdateRef.current >= fallSpeed) {
        lastUpdateRef.current = ts;
        if (!isClearing && !checkReset()) {
          setFallingPiece(prev => {
            if (!prev) return createNewPiece();
            const ny = prev.y + 1;
            if (canPlace(prev, prev.x, ny)) return { ...prev, y: ny };
            placePiece(prev);
            setTimeout(clearFullLines, 50);
            return createNewPiece();
          });
        }
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [canPlace, createNewPiece, placePiece, clearFullLines, checkReset, isClearing, fallSpeed]);

  const displayGrid = grid.map(row => row.map(c => ({ ...c })));
  if (fallingPiece && !isClearing) {
    for (let r = 0; r < fallingPiece.shape.length; r++)
      for (let c = 0; c < fallingPiece.shape[r].length; c++)
        if (fallingPiece.shape[r][c]) {
          const gx = fallingPiece.x + c, gy = fallingPiece.y + r;
          if (gy >= 0 && gy < config.gridHeight && gx >= 0 && gx < config.gridWidth)
            displayGrid[gy][gx] = { filled: true, color: fallingPiece.color };
        }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`border border-border bg-background ${config.padding}`}>
        {displayGrid.map((row, ri) => (
          <div key={ri} className="flex">
            {row.map((cell, ci) => (
              <div
                key={ci}
                className={`${config.cellSize} border border-border/30 transition-all duration-75 ${
                  cell.filled ? `${cell.color}` : 'bg-muted/20'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      {showLoadingText && (
        <p className="text-xs font-mono text-muted-foreground animate-pulse">{loadingText}</p>
      )}
    </div>
  );
}
