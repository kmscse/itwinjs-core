/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/

import { Id64 } from "@bentley/bentleyjs-core";
import { Transform } from "@bentley/geometry-core";
import { ElementAlignedBox3d } from "./geometry/Primitives";

export class TileId {
  public constructor(
    /** The unique identifer of this tile's TileTree among within the iModel */
    public readonly treeId: Id64,
    /** The unique identifier of this tile within its TileTree. */
    public readonly tileId: string) { }
}

/** The metadata describing a single Tile */
export interface TileProps {
  /** The unique identifier of the tile within the iModel */
  id: TileId;
  /** The id of the tile's parent within its TileTree, if it is not the root tile. */
  parentId?: string;
  /** The volume in which all of the tile's contents reside */
  range: ElementAlignedBox3d;
  /** Optional volume within the tile's range which more tightly encloses the tile geometry */
  contentRange?: ElementAlignedBox3d;
  /** The maximum size in pixels at which the tile should be drawn on the screen. */
  maximumSize: number;
  /** The IDs of this tile's child tiles within its TileTree */
  childIds: string[];
  /** Optional scaling factor applied to this tile's maximum size */
  zoomFactor?: number;
}

export interface TileGeometryProps {
  /** The unique identifier of the tile within the iModel */
  id: TileId;
  /** A binary representation of the tile's geometry */
  geometry: Uint8Array;
}

/** The metdata describing a TileTree */
export interface TileTreeProps {
  /** The unique identifier of this TileTree within the iModel */
  id: Id64;
  /** Metadata describing the tree's root Tile. */
  rootTile: TileProps;
  /** Transform tile coordinates to iModel world coordinates. */
  location: Transform;
  /** If defined, limits the number of child tiles which can be skipped in selecting tiles of appropriate LOD */
  maxTilesToSkip?: number;
  // ###TODO: ViewFlag.Overrides, ClipVector
}
