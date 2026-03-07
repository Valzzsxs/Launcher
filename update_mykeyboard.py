import sys

def update_keyboard():
    with open('src/mykeyboard.cpp', 'r') as f:
        content = f.read()

    # Find the end of #if defined(HAS_ENCODER)
    # The end of this block is line 790: #endif
    # We will insert our fallback logic right after this #endif.

    # We can search for the HAS_ENCODER block
    search_str = """                }
            }
#endif
        } // end of physical input detection

        if (selection_made) { // if something was selected then handle it"""

    replace_str = """                }
            }
#elif defined(HAS_BTN)
            if (check(SelPress)) {
                selection_made = true;
            } else {
                /* Down Btn to move in X axis (to the right) */
                if (check(NextPress) && touchPoint.pressed == false) {
                    if (EscPress) {
                        y++;
                    } else if ((x >= buttons_number - 1 && y <= -1) || (x >= KeyboardWidth - 1 && y >= 0)) {
                        // if we are at the end of the current line
                        y++;   // next line
                        x = 0; // reset to first key
                    } else x++;

                    if (y >= KeyboardHeight)
                        y = -1; // if we are at the end of the keyboard, then return to the top

                    if (y == -1 && x >= buttons_number) x = 0;

                    redraw = true;
                }
                /* PREV "Btn" to move backwards on th X axis (to the left) */
                if (check(PrevPress) && touchPoint.pressed == false) {
                    if (EscPress) {
                        y--;
                    } else if (x <= 0) {
                        y--;
                        if (y == -1) x = buttons_number - 1;
                        else x = KeyboardWidth - 1;
                    } else x--;

                    if (y < -1) { // go back to the bottom right of the keyboard
                        y = KeyboardHeight - 1;
                        x = KeyboardWidth - 1;
                    }

                    redraw = true;
                }
            }
#endif
        } // end of physical input detection

        if (selection_made) { // if something was selected then handle it"""

    new_content = content.replace(search_str, replace_str)

    with open('src/mykeyboard.cpp', 'w') as f:
        f.write(new_content)

if __name__ == "__main__":
    update_keyboard()
