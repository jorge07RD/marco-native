export interface Rect {
  top: number
  left: number
  right: number
  bottom: number
}

/** Rect de un nodo por id, vía SelectorQuery. Resuelve a null si el nodo no
 *  existe todavía o el invoke falla — quien llama decide qué hacer sin eso.
 *
 *  El `invoke` solo admite selectores de id (ver NODE_REF_INVOKE_ERROR_CODE en
 *  los tipos de Lynx): con una clase falla en silencio. */
export function medirRect(selector: string): Promise<Rect | null> {
  return new Promise((resolve) => {
    lynx
      .createSelectorQuery()
      .select(selector)
      .invoke({
        method: 'boundingClientRect',
        success: (res: Rect) => resolve(res),
        fail: () => resolve(null),
      })
      .exec()
  })
}
