export class AssetSize {
  name: string
  sizeRatio: number
  maxTextureSize: number

  constructor(name: string, sizeRatio: number, maxTextureSize: number) {
    this.name = name
    this.sizeRatio = sizeRatio
    this.maxTextureSize = maxTextureSize
  }
}
