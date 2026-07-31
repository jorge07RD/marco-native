// Copyright (c) 2025 TikTok Pte. Ltd.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

declare module '@lynx-js/types' {
  interface GlobalProps {
    preferredTheme?: string;
    theme: string;
    isNotchScreen: boolean;
  }

  /**
   * El <input> de esta app no es el de Lynx: es el componente propio
   * LynxInputComponent.kt del shell Android, registrado en
   * SparklingApplication.kt como Behavior("input"). Expone dos @LynxProp que
   * el tipo de @lynx-js/types no conoce, así que se añaden aquí.
   *
   * OJO: esto tiene que ser una *ampliación* de la InputProps del paquete.
   * Antes este archivo declaraba su propio `export interface InputProps` por
   * fuera del `declare module`, y no servía de nada: dentro del bloque de
   * ampliación el identificador `InputProps` resuelve al del paquete, no al
   * local, así que el `value` que declaraba quedaba muerto y `<input value=…>`
   * no compilaba.
   */
  interface InputProps {
    /**
     * Contenido del input. Lo aplica @LynxProp(name="value") en el Kotlin,
     * que además ignora el set cuando el texto ya coincide — por eso sirve
     * como input controlado sin pelear con lo que se está tecleando.
     */
    value?: string;

    /**
     * Color del texto; el Kotlin deriva de aquí el color del placeholder.
     */
    'text-color'?: string;
  }
}

export {};
